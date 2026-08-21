"""
Chat API — RAG-powered Q&A with document context and citations.
"""

from fastapi import APIRouter, HTTPException

from core.gemini_client import get_gemini_client
from core.vector_store import get_vector_store
from core.prompt_templates import SYSTEM_CHAT, chat_prompt
from core.security import get_current_user
from fastapi import Depends
from models.database import SessionLocal, Document, ChatMessage, Workspace, User
from models.schemas import ChatRequest, ChatResponse

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat_with_document(request: ChatRequest, current_user: User = Depends(get_current_user)):
    """Chat with a document using RAG-powered Q&A."""

    # Verify workspace exists (optional, could just rely on vector store)
    # Get chat history for context
    db = SessionLocal()
    try:
        workspace = db.query(Workspace).filter(Workspace.id == request.workspace_id, Workspace.user_id == current_user.id).first()
        if not workspace:
            raise HTTPException(status_code=403, detail="Forbidden")
        master_context = workspace.master_context if workspace else ""
        
        history_records = (
            db.query(ChatMessage)
            .filter(ChatMessage.workspace_id == request.workspace_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(10)
            .all()
        )
        chat_history = [
            {"role": msg.role, "content": msg.content}
            for msg in reversed(history_records)
        ]
    finally:
        db.close()

    # Search for relevant chunks
    vector_store = get_vector_store()
    relevant_chunks = vector_store.search(request.workspace_id, request.message, top_k=6)

    if not relevant_chunks:
        raise HTTPException(
            status_code=400,
            detail="No indexed content found for this document.",
        )

    # Build prompt and generate response
    gemini = get_gemini_client()
    prompt = chat_prompt(request.message, relevant_chunks, chat_history, master_context)

    try:
        response_text = await gemini.generate(
            prompt, 
            system_instruction=SYSTEM_CHAT,
            use_web_search=request.use_web_search
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

    # Extract source pages from relevant chunks
    sources = [
        {
            "page": chunk["page"],
            "section": chunk.get("section", "Unknown"),
            "relevance": chunk.get("relevance", 0),
            "preview": chunk["text"][:150] + "..." if len(chunk["text"]) > 150 else chunk["text"],
        }
        for chunk in relevant_chunks[:4]
    ]

    # Save messages to history
    db = SessionLocal()
    try:
        user_msg = ChatMessage(workspace_id=request.workspace_id, role="user", content=request.message)
        ai_msg = ChatMessage(workspace_id=request.workspace_id, role="assistant", content=response_text, sources=sources)
        db.add(user_msg)
        db.add(ai_msg)
        db.commit()
    finally:
        db.close()

    # Extract suggested questions from response (if present)
    suggested = []
    if "follow-up" in response_text.lower() or "you might" in response_text.lower():
        lines = response_text.split("\n")
        for line in lines:
            stripped = line.strip().lstrip("- •123456789.)")
            if stripped.endswith("?") and len(stripped) > 15:
                suggested.append(stripped)
        suggested = suggested[:3]

    return ChatResponse(
        response=response_text,
        sources=sources,
        suggested_questions=suggested,
    )


@router.get("/chat/history/{workspace_id}")
async def get_chat_history(workspace_id: str, current_user: User = Depends(get_current_user)):
    """Get chat history for a workspace."""
    db = SessionLocal()
    try:
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id, Workspace.user_id == current_user.id).first()
        if not workspace:
            raise HTTPException(status_code=403, detail="Forbidden")
            
        messages = (
            db.query(ChatMessage)
            .filter(ChatMessage.workspace_id == workspace_id)
            .order_by(ChatMessage.created_at.asc())
            .all()
        )
        return {
            "messages": [
                {
                    "role": msg.role,
                    "content": msg.content,
                    "sources": msg.sources or [],
                    "timestamp": msg.created_at.isoformat() if msg.created_at else None,
                }
                for msg in messages
            ]
        }
    finally:
        db.close()


@router.delete("/chat/history/{workspace_id}")
async def clear_chat_history(workspace_id: str, current_user: User = Depends(get_current_user)):
    """Clear chat history for a workspace."""
    db = SessionLocal()
    try:
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id, Workspace.user_id == current_user.id).first()
        if not workspace:
            raise HTTPException(status_code=403, detail="Forbidden")
            
        db.query(ChatMessage).filter(ChatMessage.workspace_id == workspace_id).delete()
        db.commit()
        return {"message": "Chat history cleared."}
    finally:
        db.close()
