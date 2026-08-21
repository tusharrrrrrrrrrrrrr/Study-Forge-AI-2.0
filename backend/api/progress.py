"""
Progress API — Learning analytics and progress tracking.
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import func
from core.security import get_current_user

from models.database import (
    SessionLocal, Workspace, ChatMessage, QuizResult, FlashcardProgress, StudySession, User
)

router = APIRouter()


@router.get("/progress/{workspace_id}")
async def get_progress(workspace_id: str, current_user: User = Depends(get_current_user)):
    """Get learning progress for a specific workspace."""
    db = SessionLocal()
    try:
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id, Workspace.user_id == current_user.id).first()
        if not workspace:
            raise HTTPException(status_code=403, detail="Workspace not found or access denied.")

        # Quiz history
        quizzes = (
            db.query(QuizResult)
            .filter(QuizResult.workspace_id == workspace_id)
            .order_by(QuizResult.taken_at.desc())
            .limit(20)
            .all()
        )
        quiz_history = [
            {
                "total_questions": q.total_questions,
                "correct_answers": q.correct_answers,
                "score_percent": q.score_percent,
                "difficulty": q.difficulty,
                "taken_at": q.taken_at.isoformat() if q.taken_at else None,
            }
            for q in quizzes
        ]

        # Average quiz score
        avg_score = (
            db.query(func.avg(QuizResult.score_percent))
            .filter(QuizResult.workspace_id == workspace_id)
            .scalar()
        ) or 0.0

        # Flashcard mastery
        flashcard_stats = (
            db.query(FlashcardProgress.mastery, func.count())
            .filter(FlashcardProgress.workspace_id == workspace_id)
            .group_by(FlashcardProgress.mastery)
            .all()
        )
        flashcard_mastery = {level: count for level, count in flashcard_stats}

        # Chat message count
        chat_count = (
            db.query(func.count(ChatMessage.id))
            .filter(ChatMessage.workspace_id == workspace_id)
            .scalar()
        ) or 0

        # Total study time
        total_time = (
            db.query(func.sum(StudySession.duration_seconds))
            .filter(StudySession.workspace_id == workspace_id)
            .scalar()
        ) or 0

        return {
            "workspace_id": workspace_id,
            "workspace_title": workspace.name,
            "quiz_history": quiz_history,
            "flashcard_mastery": flashcard_mastery,
            "total_study_time": total_time,
            "chat_message_count": chat_count,
            "average_quiz_score": round(avg_score, 1),
        }
    finally:
        db.close()


@router.get("/progress")
async def get_overall_progress(current_user: User = Depends(get_current_user)):
    """Get overall learning progress across all workspaces."""
    db = SessionLocal()
    try:
        workspaces = db.query(Workspace).filter(Workspace.user_id == current_user.id).all()

        overall = {
            "total_workspaces": len(workspaces),
            "total_quizzes_taken": db.query(func.count(QuizResult.id)).scalar() or 0,
            "overall_avg_score": round(
                db.query(func.avg(QuizResult.score_percent)).scalar() or 0, 1
            ),
            "total_chat_messages": db.query(func.count(ChatMessage.id)).scalar() or 0,
            "total_flashcards_reviewed": db.query(func.count(FlashcardProgress.id)).scalar() or 0,
            "workspaces": [
                {
                    "id": w.id,
                    "name": w.name,
                    "created_at": w.created_at.isoformat() if w.created_at else None,
                }
                for w in workspaces
            ],
        }
        return overall
    finally:
        db.close()
