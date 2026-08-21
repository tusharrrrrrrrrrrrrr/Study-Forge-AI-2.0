"""
Study API — Summaries, Flashcards, Quizzes, and Concept extraction.
"""

from fastapi import APIRouter, HTTPException, Depends
from core.security import get_current_user
from models.database import User

from core.gemini_client import get_gemini_client
from core.vector_store import get_vector_store
from core import prompt_templates as prompts
from models.database import SessionLocal, Workspace, QuizResult, FlashcardProgress, SummaryCache
from models.schemas import (
    SummaryRequest, SummaryResponse,
    FlashcardRequest, FlashcardResponse, Flashcard, FlashcardProgressUpdate,
    QuizRequest, QuizResponse, QuizQuestion,
    QuizSubmission, QuizResultResponse,
    ConceptsRequest, ConceptsResponse, ConceptNode, ConceptRelationship,
    VisualRequest, VisualResponse,
    MockExamRequest, MockExamResponse, MockExamQuestion,
    MockExamSubmission, MockExamResultResponse, MockExamResultItem
)

router = APIRouter()


def _get_workspace_content(workspace_id: str, user_id: str, max_chunks: int = 30) -> tuple[str, str, str]:
    """Get workspace content and title. Returns (content_text, workspace_title, master_context)."""
    db = SessionLocal()
    try:
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id, Workspace.user_id == user_id).first()
        if not workspace:
            raise HTTPException(status_code=403, detail="Workspace not found or access denied.")
        workspace_title = workspace.name
        master_context = workspace.master_context or ""
    finally:
        db.close()

    vector_store = get_vector_store()
    chunks = vector_store.get_all_chunks(workspace_id)

    if not chunks:
        raise HTTPException(status_code=400, detail="No indexed content found in this workspace.")

    # Limit chunks to avoid token limits
    chunks = chunks[:max_chunks]
    content_text = "\n\n".join(
        f"[Page {c['page']}] {c['text']}" for c in chunks
    )
    return content_text, workspace_title, master_context


# ─── SUMMARIES ─────────────────────────────────────────────

@router.post("/summary", response_model=SummaryResponse)
async def generate_summary(request: SummaryRequest, current_user: User = Depends(get_current_user)):
    """Generate a document summary in the specified mode."""
    content, workspace_title, master_context = _get_workspace_content(request.workspace_id, current_user.id)
    combined_content = f"--- MASTER CONTEXT ---\n{master_context}\n\n--- DETAILED EXCERPTS ---\n{content}" if master_context else content

    db = SessionLocal()
    try:
        cached = db.query(SummaryCache).filter(
            SummaryCache.workspace_id == request.workspace_id,
            SummaryCache.mode == request.mode
        ).first()
        
        if cached:
            return SummaryResponse(summary=cached.content, mode=request.mode, workspace_title=workspace_title)

        gemini = get_gemini_client()
        prompt = prompts.summary_prompt(combined_content, mode=request.mode)
        system = prompts.SYSTEM_ELI5 if request.mode == "eli5" else prompts.SYSTEM_SUMMARY

        try:
            summary = await gemini.generate(prompt, system_instruction=system, temperature=0.6)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Summary generation failed: {str(e)}")

        new_cache = SummaryCache(workspace_id=request.workspace_id, mode=request.mode, content=summary)
        db.add(new_cache)
        db.commit()
    finally:
        db.close()

    return SummaryResponse(summary=summary, mode=request.mode, workspace_title=workspace_title)


# ─── FLASHCARDS ────────────────────────────────────────────

@router.post("/flashcards", response_model=FlashcardResponse)
async def generate_flashcards(request: FlashcardRequest, current_user: User = Depends(get_current_user)):
    """Generate study flashcards from document content."""
    content, workspace_title, master_context = _get_workspace_content(request.workspace_id, current_user.id)
    combined_content = f"--- MASTER CONTEXT ---\n{master_context}\n\n--- DETAILED EXCERPTS ---\n{content}" if master_context else content

    gemini = get_gemini_client()
    prompt = prompts.flashcard_prompt(combined_content, count=request.count, difficulty=request.difficulty)

    try:
        raw_cards = await gemini.generate_json(prompt, system_instruction=prompts.SYSTEM_FLASHCARD)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Flashcard generation failed: {str(e)}")

    # Parse and validate
    cards = []
    card_list = raw_cards if isinstance(raw_cards, list) else raw_cards.get("flashcards", [])
    for card_data in card_list:
        try:
            cards.append(Flashcard(
                front=card_data.get("front", ""),
                back=card_data.get("back", ""),
                type=card_data.get("type", "concept"),
                difficulty=card_data.get("difficulty", "medium"),
                source_page=card_data.get("source_page"),
                topic=card_data.get("topic", ""),
            ))
        except Exception:
            continue

    return FlashcardResponse(flashcards=cards, workspace_title=workspace_title)


@router.post("/flashcards/progress")
async def update_flashcard_progress(update: FlashcardProgressUpdate, current_user: User = Depends(get_current_user)):
    """Update mastery progress for a flashcard."""
    db = SessionLocal()

    try:
        workspace = db.query(Workspace).filter(Workspace.id == update.workspace_id, Workspace.user_id == current_user.id).first()
        if not workspace:
            raise HTTPException(status_code=403, detail="Forbidden")

        existing = (
            db.query(FlashcardProgress)
            .filter(
                FlashcardProgress.workspace_id == update.workspace_id,
                FlashcardProgress.card_index == update.card_index,
            )
            .first()
        )

        if existing:
            existing.mastery = update.mastery
            existing.times_reviewed += 1
        else:
            progress = FlashcardProgress(
                workspace_id=update.workspace_id,
                card_index=update.card_index,
                mastery=update.mastery,
            )
            db.add(progress)

        db.commit()
        return {"message": "Progress updated."}
    finally:
        db.close()


# ─── QUIZZES ───────────────────────────────────────────────

@router.post("/quiz", response_model=QuizResponse)
async def generate_quiz(request: QuizRequest, current_user: User = Depends(get_current_user)):
    """Generate quiz questions from document content."""
    content, workspace_title, master_context = _get_workspace_content(request.workspace_id, current_user.id)
    combined_content = f"--- MASTER CONTEXT ---\n{master_context}\n\n--- DETAILED EXCERPTS ---\n{content}" if master_context else content

    gemini = get_gemini_client()
    prompt = prompts.quiz_prompt(combined_content, count=request.count, difficulty=request.difficulty)

    try:
        raw_questions = await gemini.generate_json(prompt, system_instruction=prompts.SYSTEM_QUIZ)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {str(e)}")

    # Parse and validate
    questions = []
    q_list = raw_questions if isinstance(raw_questions, list) else raw_questions.get("questions", [])
    for q_data in q_list:
        try:
            questions.append(QuizQuestion(
                question=q_data.get("question", ""),
                type=q_data.get("type", "mcq"),
                options=q_data.get("options"),
                correct_answer=str(q_data.get("correct_answer", "")),
                explanation=q_data.get("explanation", ""),
                difficulty=q_data.get("difficulty", "medium"),
                source_page=q_data.get("source_page"),
                topic=q_data.get("topic", ""),
            ))
        except Exception:
            continue

    return QuizResponse(questions=questions, workspace_title=workspace_title)


@router.post("/quiz/submit", response_model=QuizResultResponse)
async def submit_quiz(submission: QuizSubmission, current_user: User = Depends(get_current_user)):
    """Submit quiz answers and get grading results."""
    correct = 0
    results = []

    for answer in submission.answers:
        idx = answer.get("question_index", 0)
        user_ans = str(answer.get("user_answer", "")).strip().lower()
        correct_ans = str(answer.get("correct_answer", "")).strip().lower()
        is_correct = user_ans == correct_ans

        if is_correct:
            correct += 1

        results.append({
            "question_index": idx,
            "user_answer": answer.get("user_answer", ""),
            "correct_answer": answer.get("correct_answer", ""),
            "is_correct": is_correct,
            "explanation": answer.get("explanation", ""),
        })

    percentage = (correct / submission.total_questions * 100) if submission.total_questions > 0 else 0

    # Save quiz result
    db = SessionLocal()

    try:
        workspace = db.query(Workspace).filter(Workspace.id == submission.workspace_id, Workspace.user_id == current_user.id).first()
        if not workspace:
            raise HTTPException(status_code=403, detail="Forbidden")

        result = QuizResult(
            workspace_id=submission.workspace_id,
            total_questions=submission.total_questions,
            correct_answers=correct,
            score_percent=percentage,
        )
        db.add(result)
        db.commit()
    finally:
        db.close()

    return QuizResultResponse(
        score=correct,
        total=submission.total_questions,
        percentage=round(percentage, 1),
        results=results,
    )


# ─── CONCEPTS ──────────────────────────────────────────────

@router.post("/concepts", response_model=ConceptsResponse)
async def extract_concepts(request: ConceptsRequest, current_user: User = Depends(get_current_user)):
    """Extract key concepts and relationships from document."""
    content, workspace_title, master_context = _get_workspace_content(request.workspace_id, current_user.id, max_chunks=20)
    combined_content = f"--- MASTER CONTEXT ---\n{master_context}\n\n--- DETAILED EXCERPTS ---\n{content}" if master_context else content

    gemini = get_gemini_client()
    prompt = prompts.concepts_prompt(combined_content)

    try:
        raw_data = await gemini.generate_json(prompt, system_instruction=prompts.SYSTEM_CONCEPTS)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Concept extraction failed: {str(e)}")

    concepts = [
        ConceptNode(**c) for c in raw_data.get("concepts", [])
    ]
    relationships = [
        ConceptRelationship(**r) for r in raw_data.get("relationships", [])
    ]

    return ConceptsResponse(
        concepts=concepts,
        relationships=relationships,
        workspace_title=workspace_title,
    )


# ─── VISUALS ───────────────────────────────────────────────

@router.post("/visuals", response_model=VisualResponse)
async def generate_visuals(request: VisualRequest, current_user: User = Depends(get_current_user)):
    """Generate a Mermaid.js diagram and mnemonic device."""
    content, workspace_title, master_context = _get_workspace_content(request.workspace_id, current_user.id, max_chunks=20)
    combined_content = f"--- MASTER CONTEXT ---\n{master_context}\n\n--- DETAILED EXCERPTS ---\n{content}" if master_context else content

    gemini = get_gemini_client()
    prompt = prompts.visuals_prompt(combined_content, topic=request.topic)

    try:
        raw_data = await gemini.generate_json(prompt, system_instruction=prompts.SYSTEM_VISUALS)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Visuals generation failed: {str(e)}")

    return VisualResponse(
        mermaid_code=raw_data.get("mermaid_code", "graph TD\\n A[No data]-->B[Try again]"),
        mnemonic=raw_data.get("mnemonic", "No mnemonic generated."),
        explanation=raw_data.get("explanation", "Could not generate an explanation."),
        workspace_title=workspace_title,
    )


# ─── MOCK EXAM ─────────────────────────────────────────────

@router.post("/mock_exam", response_model=MockExamResponse)
async def generate_mock_exam(request: MockExamRequest, current_user: User = Depends(get_current_user)):
    """Generate a mock exam."""
    content, workspace_title, master_context = _get_workspace_content(request.workspace_id, current_user.id, max_chunks=30)
    combined_content = f"--- MASTER CONTEXT ---\n{master_context}\n\n--- DETAILED EXCERPTS ---\n{content}" if master_context else content

    gemini = get_gemini_client()
    prompt = prompts.mock_exam_prompt(combined_content, duration_minutes=request.duration_minutes)

    try:
        raw_data = await gemini.generate_json(prompt, system_instruction=prompts.SYSTEM_MOCK_EXAM)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Mock Exam generation failed: {str(e)}")

    questions = []
    q_list = raw_data if isinstance(raw_data, list) else raw_data.get("questions", [])
    for q_data in q_list:
        try:
            questions.append(MockExamQuestion(
                question=q_data.get("question", ""),
                type=q_data.get("type", "mcq"),
                options=q_data.get("options"),
                points=q_data.get("points", 1)
            ))
        except Exception:
            continue

    return MockExamResponse(
        questions=questions,
        duration_minutes=request.duration_minutes,
        workspace_title=workspace_title
    )


@router.post("/mock_exam/submit", response_model=MockExamResultResponse)
async def submit_mock_exam(submission: MockExamSubmission, current_user: User = Depends(get_current_user)):
    """Grade a mock exam submission."""
    content, workspace_title, master_context = _get_workspace_content(submission.workspace_id, current_user.id, max_chunks=30)
    combined_content = f"--- MASTER CONTEXT ---\n{master_context}\n\n--- DETAILED EXCERPTS ---\n{content}" if master_context else content

    gemini = get_gemini_client()
    prompt = prompts.mock_exam_grading_prompt(combined_content, submission.answers)

    try:
        raw_results = await gemini.generate_json(prompt, system_instruction=prompts.SYSTEM_MOCK_EXAM_GRADER)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Mock Exam grading failed: {str(e)}")

    results = []
    total_score = 0
    max_total_score = 0

    r_list = raw_results if isinstance(raw_results, list) else raw_results.get("results", [])
    for r_data in r_list:
        try:
            score = int(r_data.get("score", 0))
            max_score = int(r_data.get("max_score", 1))
            total_score += score
            max_total_score += max_score
            
            results.append(MockExamResultItem(
                question_index=int(r_data.get("question_index", 0)),
                question=r_data.get("question", ""),
                user_answer=r_data.get("user_answer", ""),
                correct_answer=r_data.get("correct_answer", ""),
                score=score,
                max_score=max_score,
                feedback=r_data.get("feedback", "")
            ))
        except Exception:
            continue

    percentage = (total_score / max_total_score * 100) if max_total_score > 0 else 0

    return MockExamResultResponse(
        total_score=total_score,
        max_total_score=max_total_score,
        percentage=percentage,
        results=results
    )
