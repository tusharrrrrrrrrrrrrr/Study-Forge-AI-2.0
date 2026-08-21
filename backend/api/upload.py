"""
Upload API — Workspace CRUD, PDF upload, processing, and indexing pipeline.
"""

import os
import uuid
import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException

from core.gemini_client import get_gemini_client
from core import prompt_templates as prompts
from core.pdf_processor import PDFProcessor
from core.chunker import SmartChunker
from core.vector_store import get_vector_store
from core.security import get_current_user
from fastapi import Depends
from models.database import SessionLocal, Document, Workspace, ChatMessage, QuizResult, FlashcardProgress, StudySession, SummaryCache, User
from models.schemas import UploadResponse, WorkspaceCreate, WorkspaceResponse, WorkspaceListResponse, WorkspaceWithDocuments, DocumentInfo

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ─── WORKSPACES ─────────────────────────────────────────────

@router.post("/workspaces", response_model=WorkspaceResponse)
async def create_workspace(request: WorkspaceCreate, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        workspace = Workspace(
            id=str(uuid.uuid4())[:12],
            name=request.name,
            user_id=current_user.id
        )
        db.add(workspace)
        db.commit()
        return WorkspaceResponse(id=workspace.id, name=workspace.name, created_at=workspace.created_at)
    finally:
        db.close()


@router.get("/workspaces", response_model=WorkspaceListResponse)
async def list_workspaces(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        workspaces = db.query(Workspace).filter(Workspace.user_id == current_user.id).order_by(Workspace.created_at.desc()).all()
        result = []
        for w in workspaces:
            docs = db.query(Document).filter(Document.workspace_id == w.id).all()
            doc_infos = [
                DocumentInfo(
                    id=d.id, workspace_id=d.workspace_id, filename=d.filename, title=d.title, 
                    author=d.author, total_pages=d.total_pages, total_chunks=d.total_chunks, 
                    file_size=d.file_size, uploaded_at=d.uploaded_at
                ) for d in docs
            ]
            result.append(WorkspaceWithDocuments(id=w.id, name=w.name, created_at=w.created_at, documents=doc_infos))
        return WorkspaceListResponse(workspaces=result)
    finally:
        db.close()


@router.delete("/workspaces/{workspace_id}")
async def delete_workspace(workspace_id: str, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id, Workspace.user_id == current_user.id).first()
        if not workspace:
            raise HTTPException(status_code=403, detail="Workspace not found or access denied.")
            
        docs = db.query(Document).filter(Document.workspace_id == workspace_id).all()
        for doc in docs:
            if os.path.exists(doc.filepath):
                os.remove(doc.filepath)
        
        # Delete from vector store
        vector_store = get_vector_store()
        vector_store.delete_workspace(workspace_id)
        
        # Cascading deletes manually for sqlite basic setup
        db.query(Document).filter(Document.workspace_id == workspace_id).delete()
        db.query(ChatMessage).filter(ChatMessage.workspace_id == workspace_id).delete()
        db.query(QuizResult).filter(QuizResult.workspace_id == workspace_id).delete()
        db.query(FlashcardProgress).filter(FlashcardProgress.workspace_id == workspace_id).delete()
        db.query(StudySession).filter(StudySession.workspace_id == workspace_id).delete()
        db.query(SummaryCache).filter(SummaryCache.workspace_id == workspace_id).delete()
        db.delete(workspace)
        db.commit()
        return {"message": f"Workspace deleted successfully."}
    finally:
        db.close()

# ─── UPLOADS & DOCUMENTS ────────────────────────────────────

@router.post("/workspaces/{workspace_id}/upload", response_model=UploadResponse)
async def upload_pdf(workspace_id: str, file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id, Workspace.user_id == current_user.id).first()
        if not workspace:
            raise HTTPException(status_code=403, detail="Workspace not found or access denied.")
            
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are supported.")

        doc_id = str(uuid.uuid4())[:12]
        filepath = os.path.join(UPLOAD_DIR, f"{workspace_id}_{doc_id}_{file.filename}")
        
        try:
            with open(filepath, "wb") as f:
                content = await file.read()
                f.write(content)
            file_size = len(content)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

        try:
            processor = PDFProcessor()
            pdf_doc = processor.process(filepath)
        except Exception as e:
            os.remove(filepath)
            raise HTTPException(status_code=400, detail=f"Failed to process PDF: {str(e)}")

        chunker = SmartChunker()
        chunks = chunker.chunk_document(pdf_doc)

        if not chunks:
            os.remove(filepath)
            raise HTTPException(status_code=400, detail="Could not extract any text from this PDF.")

        try:
            vector_store = get_vector_store()
            total_chunks = vector_store.index_chunks(workspace_id, doc_id, chunks)
        except Exception as e:
            os.remove(filepath)
            raise HTTPException(status_code=500, detail=f"Failed to index document: {str(e)}")

        doc = Document(
            id=doc_id,
            workspace_id=workspace_id,
            filename=file.filename,
            filepath=filepath,
            title=pdf_doc.title,
            author=pdf_doc.author,
            total_pages=pdf_doc.total_pages,
            total_chunks=total_chunks,
            file_size=file_size,
            toc=[t for t in pdf_doc.toc],
        )
        db.add(doc)
        
        # Auto-rename workspace if it still has the default "Workspace " name
        if workspace.name.startswith("Workspace "):
            new_name = pdf_doc.title if pdf_doc.title else file.filename.replace('.pdf', '')
            if new_name.strip():
                workspace.name = new_name[:60]
                db.add(workspace)
                
        # Generate Master Context
        try:
            gemini = get_gemini_client()
            # Get up to 30 chunks to generate/update context (to avoid token limits)
            context_chunks = "\n".join([c.text for c in chunks[:30]])
            
            prompt = prompts.master_context_prompt(context_chunks, workspace.master_context)
            
            new_master_context = await gemini.generate(
                prompt=prompt,
                system_instruction=prompts.SYSTEM_MASTER_CONTEXT,
                temperature=0.3
            )
            
            workspace.master_context = new_master_context
            db.add(workspace)
        except Exception as e:
            print(f"Warning: Failed to generate master context: {e}")
                
        # Clear summary cache for this workspace since context changed
        db.query(SummaryCache).filter(SummaryCache.workspace_id == workspace_id).delete()
        db.commit()

        return UploadResponse(
            workspace_id=workspace_id,
            doc_id=doc_id,
            filename=file.filename,
            title=pdf_doc.title,
            author=pdf_doc.author,
            total_pages=pdf_doc.total_pages,
            total_chunks=total_chunks,
            file_size=file_size,
            message=f"Successfully processed '{pdf_doc.title}'."
        )
    finally:
        db.close()


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found.")
            
        workspace = db.query(Workspace).filter(Workspace.id == doc.workspace_id, Workspace.user_id == current_user.id).first()
        if not workspace:
            raise HTTPException(status_code=403, detail="Access denied.")

        if os.path.exists(doc.filepath):
            os.remove(doc.filepath)

        vector_store = get_vector_store()
        vector_store.delete_document(doc.workspace_id, doc_id)

        # Clear summary cache since document was removed
        db.query(SummaryCache).filter(SummaryCache.workspace_id == doc.workspace_id).delete()
        
        db.delete(doc)
        db.commit()

        return {"message": f"Document deleted successfully."}
    finally:
        db.close()
