"""
Pydantic Schemas — Request/Response models for the API.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# --- Authentication ---
class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None


# --- Workspaces ---
class WorkspaceCreate(BaseModel):
    name: str


class WorkspaceResponse(BaseModel):
    id: str
    name: str
    created_at: datetime


# --- Upload ---
class UploadResponse(BaseModel):
    workspace_id: str
    doc_id: str
    filename: str
    title: str
    author: str
    total_pages: int
    total_chunks: int
    file_size: int
    message: str


# --- Chat ---
class ChatRequest(BaseModel):
    workspace_id: str
    message: str
    use_web_search: bool = False


class ChatResponse(BaseModel):
    response: str
    sources: list[dict]
    suggested_questions: list[str] = []


# --- Summary ---
class SummaryRequest(BaseModel):
    workspace_id: str
    mode: str = "full"  # full, chapter, eli5, key_terms


class SummaryResponse(BaseModel):
    summary: str
    mode: str
    workspace_title: str


# --- Flashcards ---
class FlashcardRequest(BaseModel):
    workspace_id: str
    count: int = 10
    difficulty: str = "mixed"  # easy, mixed, hard


class Flashcard(BaseModel):
    front: str
    back: str
    type: str
    difficulty: str
    source_page: Optional[int] = None
    topic: str = ""


class FlashcardResponse(BaseModel):
    flashcards: list[Flashcard]
    workspace_title: str


class FlashcardProgressUpdate(BaseModel):
    workspace_id: str
    card_index: int
    mastery: str  # new, learning, mastered


# --- Quiz ---
class QuizRequest(BaseModel):
    workspace_id: str
    count: int = 10
    difficulty: str = "mixed"


class QuizQuestion(BaseModel):
    question: str
    type: str  # mcq, true_false, short_answer
    options: Optional[list[str]] = None
    correct_answer: str
    explanation: str
    difficulty: str
    source_page: Optional[int] = None
    topic: str = ""


class QuizResponse(BaseModel):
    questions: list[QuizQuestion]
    workspace_title: str


class QuizSubmission(BaseModel):
    workspace_id: str
    answers: list[dict]  # [{question_index, user_answer}]
    total_questions: int


class QuizResultResponse(BaseModel):
    score: int
    total: int
    percentage: float
    results: list[dict]


# --- Concepts ---
class ConceptsRequest(BaseModel):
    workspace_id: str


class ConceptNode(BaseModel):
    id: str
    label: str
    description: str
    importance: str


class ConceptRelationship(BaseModel):
    source: str
    target: str
    label: str


class ConceptsResponse(BaseModel):
    concepts: list[ConceptNode]
    relationships: list[ConceptRelationship]
    workspace_title: str


# --- Visuals ---
class VisualRequest(BaseModel):
    workspace_id: str
    topic: Optional[str] = None


class VisualResponse(BaseModel):
    mermaid_code: str
    mnemonic: str
    explanation: str
    workspace_title: str


# --- Mock Exam ---
class MockExamRequest(BaseModel):
    workspace_id: str
    duration_minutes: int = 30


class MockExamQuestion(BaseModel):
    question: str
    type: str  # mcq, short_answer, essay
    options: Optional[list[str]] = None
    points: int = 1


class MockExamResponse(BaseModel):
    questions: list[MockExamQuestion]
    duration_minutes: int
    workspace_title: str


class MockExamSubmission(BaseModel):
    workspace_id: str
    answers: list[dict]


class MockExamResultItem(BaseModel):
    question_index: int
    question: str
    user_answer: str
    correct_answer: str
    score: int
    max_score: int
    feedback: str


class MockExamResultResponse(BaseModel):
    total_score: int
    max_total_score: int
    percentage: float
    results: list[MockExamResultItem]


# --- Documents ---
class DocumentInfo(BaseModel):
    id: str
    workspace_id: str
    filename: str
    title: str
    author: str
    total_pages: int
    total_chunks: int
    file_size: int
    uploaded_at: datetime


class WorkspaceWithDocuments(WorkspaceResponse):
    documents: list[DocumentInfo]

class WorkspaceListResponse(BaseModel):
    workspaces: list[WorkspaceWithDocuments]


# --- Progress ---
class ProgressResponse(BaseModel):
    workspace_id: str
    workspace_title: str
    quiz_history: list[dict]
    flashcard_mastery: dict
    total_study_time: int
    chat_message_count: int
    average_quiz_score: float
