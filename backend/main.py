"""
AI-Powered PDF Study Assistant — FastAPI Application
Main entry point that wires up all API routes and middleware.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="AI PDF Study Assistant",
    description="An LLM-powered study companion that deeply analyzes PDFs and helps students learn.",
    version="1.0.0",
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
from api.upload import router as upload_router
from api.chat import router as chat_router
from api.study import router as study_router
from api.progress import router as progress_router
from api.auth import router as auth_router

app.include_router(upload_router, prefix="/api", tags=["Upload"])
app.include_router(chat_router, prefix="/api", tags=["Chat"])
app.include_router(study_router, prefix="/api", tags=["Study"])
app.include_router(progress_router, prefix="/api", tags=["Progress"])
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])


@app.get("/")
async def root():
    return {
        "name": "AI PDF Study Assistant",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
