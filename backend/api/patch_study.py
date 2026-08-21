import re

with open("study.py", "r") as f:
    code = f.read()

# 1. Add imports
code = code.replace(
    "from fastapi import APIRouter, HTTPException",
    "from fastapi import APIRouter, HTTPException, Depends\nfrom core.security import get_current_user\nfrom models.database import User"
)

# 2. Update _get_workspace_content
code = code.replace(
    "def _get_workspace_content(workspace_id: str, max_chunks: int = 30) -> tuple[str, str, str]:",
    "def _get_workspace_content(workspace_id: str, user_id: str, max_chunks: int = 30) -> tuple[str, str, str]:"
)
code = code.replace(
    "workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()",
    "workspace = db.query(Workspace).filter(Workspace.id == workspace_id, Workspace.user_id == user_id).first()"
)
code = code.replace(
    "raise HTTPException(status_code=404, detail=\"Workspace not found.\")",
    "raise HTTPException(status_code=403, detail=\"Workspace not found or access denied.\")"
)

# 3. Endpoints using _get_workspace_content
code = re.sub(
    r"async def generate_summary\(request: SummaryRequest\):",
    r"async def generate_summary(request: SummaryRequest, current_user: User = Depends(get_current_user)):",
    code
)
code = code.replace(
    "content, workspace_title, master_context = _get_workspace_content(request.workspace_id)",
    "content, workspace_title, master_context = _get_workspace_content(request.workspace_id, current_user.id)"
)

code = re.sub(
    r"async def generate_flashcards\(request: FlashcardRequest\):",
    r"async def generate_flashcards(request: FlashcardRequest, current_user: User = Depends(get_current_user)):",
    code
)

code = re.sub(
    r"async def generate_quiz\(request: QuizRequest\):",
    r"async def generate_quiz(request: QuizRequest, current_user: User = Depends(get_current_user)):",
    code
)

code = re.sub(
    r"async def extract_concepts\(request: ConceptsRequest\):",
    r"async def extract_concepts(request: ConceptsRequest, current_user: User = Depends(get_current_user)):",
    code
)
code = code.replace(
    "content, workspace_title, master_context = _get_workspace_content(request.workspace_id, max_chunks=20)",
    "content, workspace_title, master_context = _get_workspace_content(request.workspace_id, current_user.id, max_chunks=20)"
)

code = re.sub(
    r"async def generate_visuals\(request: VisualRequest\):",
    r"async def generate_visuals(request: VisualRequest, current_user: User = Depends(get_current_user)):",
    code
)

code = re.sub(
    r"async def generate_mock_exam\(request: MockExamRequest\):",
    r"async def generate_mock_exam(request: MockExamRequest, current_user: User = Depends(get_current_user)):",
    code
)
code = code.replace(
    "content, workspace_title, master_context = _get_workspace_content(request.workspace_id, max_chunks=30)",
    "content, workspace_title, master_context = _get_workspace_content(request.workspace_id, current_user.id, max_chunks=30)"
)

code = re.sub(
    r"async def submit_mock_exam\(submission: MockExamSubmission\):",
    r"async def submit_mock_exam(submission: MockExamSubmission, current_user: User = Depends(get_current_user)):",
    code
)
code = code.replace(
    "content, workspace_title, master_context = _get_workspace_content(submission.workspace_id, max_chunks=30)",
    "content, workspace_title, master_context = _get_workspace_content(submission.workspace_id, current_user.id, max_chunks=30)"
)

# 4. Endpoints NOT using _get_workspace_content
code = re.sub(
    r"async def update_flashcard_progress\(update: FlashcardProgressUpdate\):",
    r"async def update_flashcard_progress(update: FlashcardProgressUpdate, current_user: User = Depends(get_current_user)):",
    code
)
# For update_flashcard_progress, check workspace ownership
flashcard_check = """
    try:
        workspace = db.query(Workspace).filter(Workspace.id == update.workspace_id, Workspace.user_id == current_user.id).first()
        if not workspace:
            raise HTTPException(status_code=403, detail="Forbidden")
"""
code = code.replace(
    "    try:\n        existing = (",
    flashcard_check + "\n        existing = ("
)

code = re.sub(
    r"async def submit_quiz\(submission: QuizSubmission\):",
    r"async def submit_quiz(submission: QuizSubmission, current_user: User = Depends(get_current_user)):",
    code
)
# For submit_quiz, check workspace ownership
quiz_check = """
    try:
        workspace = db.query(Workspace).filter(Workspace.id == submission.workspace_id, Workspace.user_id == current_user.id).first()
        if not workspace:
            raise HTTPException(status_code=403, detail="Forbidden")
"""
code = code.replace(
    "    try:\n        result = QuizResult(",
    quiz_check + "\n        result = QuizResult("
)


with open("study.py", "w") as f:
    f.write(code)
