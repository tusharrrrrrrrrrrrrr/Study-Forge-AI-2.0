

<div align="center">
  <h1>📚 StudyForge AI</h1>
  <p><strong>Your Ultimate AI-Powered Study Companion</strong></p>
  <p>Upload textbooks, notes, and research papers, and watch as StudyForge transforms them into an interactive, highly intelligent learning environment powered by Google Gemini.</p>
</div>

<br />

## 🌟 The Vision

Learning from static PDFs is a thing of the past. **StudyForge AI** acts as your personal tutor, extracting knowledge from your documents and engaging you through intelligent Q&A, adaptive flashcards, instantly graded quizzes, and visual concept mapping. 

Whether you're cramming for a final exam, synthesizing a dense research paper, or just trying to organize your notes, StudyForge makes knowledge retention effortless and interactive.

---

## ✨ Core Features

### 🔒 Secure User Accounts & Authentication (NEW!)
Create personalized study accounts. All your workspaces, documents, and progress are securely isolated to your account. We use industry-standard **Argon2** password hashing and **JWT** (JSON Web Tokens) with seamless, silent token refreshing for a frictionless and secure user experience.

### 📁 Workspace-Centric Architecture (NEW!)
Say goodbye to isolated documents. Create dedicated **Workspaces** (e.g., "Biology 101" or "Q3 Financials") and upload **multiple PDFs** into a single workspace. Our intelligent vector store merges the context, allowing you to ask questions, generate flashcards, and run quizzes across all your uploaded documents simultaneously!

### 💬 Conversational RAG (Chat with your Docs)
Ask any question and get precise, context-aware answers. StudyForge utilizes advanced Retrieval-Augmented Generation (RAG) to scan your workspace, find the exact paragraphs needed, and generate an answer—complete with **source page citations** and snippets so you can verify the information yourself.

### 📝 Smart Summarizations
Short on time? Generate summaries tailored to your needs:
- **Full Overview**: A comprehensive breakdown of the workspace.
- **Chapter-by-Chapter**: A structured, sequential summary.
- **ELI5 (Explain Like I'm 5)**: Complex topics broken down into simple, digestible analogies.
- **Key Terms**: A glossary of the most important jargon.

### 🃏 Adaptive AI Flashcards
Automatically generate study flashcards based on your documents. The UI features smooth, interactive flip animations. As you study, mark cards as "New," "Learning," or "Mastered," and our built-in progress tracker will help you focus on your weak points.

### 🧪 Instant Quiz Generator
Test your knowledge with auto-generated quizzes. Choose your difficulty level and tackle Multiple Choice, True/False, and Short Answer questions. Submit your answers for instant AI grading, complete with detailed explanations for why an answer was right or wrong.

### 🧠 Visual Concept Maps
Visualize complex topics. The AI extracts the core concepts from your PDFs and maps out the relationships between them. It's the perfect bird's-eye view for visual learners.

### 🎨 AI Diagram & Mnemonic Generation (NEW!)
Generate dynamic `Mermaid.js` flowcharts and creative mnemonic memory devices (like acronyms and memory palaces) instantly to help you memorize complex workflows.

### 📝 "Mock Exam" Simulator (NEW!)
Test yourself under pressure with our timed mock exam simulator. Generates a balanced exam of Multiple Choice, Short Answer, and Essay questions. After submitting, an AI grader rigorously evaluates your answers against a rubric and provides personalized feedback.

### 🌐 Hybrid RAG with Web Grounding (NEW!)
Supplement your document's knowledge with live web search results. A toggle allows you to search the open internet for answers that might not be contained directly within your textbook!

### 📊 Learning Dashboard
Track your academic journey. The Progress Dashboard gives you a complete overview of your study sessions, including average quiz scores, flashcard mastery breakdown, and total time spent studying per workspace.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js 18+
- A free [Google Gemini API key](https://ai.google.dev)

> **⚠️ Important Note on Gemini API Limits**: The free tier of the Gemini API has strict daily and per-minute rate limits (e.g., 15 requests per minute, 1500 per day). If you hit this limit, the app will gracefully display a "Rate Limit" animation. If you plan to deploy this app to production or use it heavily, you will need to set up a paid Gemini API tier or implement billing on Google Cloud.

### 1. Set Up Your Environment
Create a `.env` file in the root of the project and add your Gemini API key:
```bash
GEMINI_API_KEY=your_api_key_here
```

### 2. Launch the Backend (FastAPI)
Our backend handles PDF processing, ChromaDB vector storage, and AI inference.
```bash
cd backend
python -m venv .venv
# Activate the venv (Windows: .\.venv\Scripts\activate, Mac/Linux: source .venv/bin/activate)
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Launch the Frontend (React + Vite)
Our frontend is a sleek, glassmorphic React application designed for a premium user experience.
```bash
cd frontend
npm install
npm run dev
```

### 4. Start Studying!
Open your browser and navigate to **http://localhost:5173**. Create your first Workspace, upload a PDF, and let the learning begin!

---

## 🏗️ Technology Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend** | Vite + React | High-performance, reactive user interface. |
| **Styling** | Vanilla CSS | Custom, premium dark-mode glassmorphism design. |
| **Backend** | Python FastAPI | Blazing fast, asynchronous API routing. |
| **LLM Engine** | Google Gemini 3.6 Flash | Lightning-fast text generation and JSON extraction. |
| **Vector DB** | ChromaDB | Local vector store for semantic similarity search. |
| **Database** | SQLite + SQLAlchemy | Relational database for progress tracking, workspaces, and users. |
| **Authentication**| JWT & Argon2 | Secure session management and modern password hashing. |
| **PDF Parsing** | PyMuPDF | Robust and accurate text extraction from PDFs. |

---

## 🔭 Future Scope & Roadmap

StudyForge is actively evolving. Here are some enterprise-grade features planned for future releases to transition this tool into a highly marketable SaaS platform:

- **🎙️ Multi-Modal Workspaces (Audio/Video)**: Integration with transcription models (like OpenAI Whisper) to allow users to upload recorded lectures alongside their slides.
- **🧠 Spaced Repetition System (SRS) & Push Notifications**: Upgrading flashcard mastery to a true cognitive algorithm (like SuperMemo-2) with daily email or push notifications to prevent the forgetting curve.
- **🤝 Collaborative "Multiplayer" Workspaces**: Real-time study groups using WebSockets, allowing classmates to share AI-generated flashcard decks and compete in live study quizzes.
- **📤 Export & Integration Ecosystem**: Direct `.apkg` exports to Anki, Markdown exports to Notion/Obsidian, and beautifully formatted printable PDF study guides.

---

## 📁 Architecture Overview

```text
StudyForge/
├── backend/                  # Python FastAPI Server
│   ├── api/                  # Route handlers (upload, chat, study, progress)
│   ├── core/                 # Business logic (Gemini client, ChromaDB, Chunker)
│   ├── models/               # SQLAlchemy DB Models & Pydantic Schemas
│   ├── data/                 # SQLite DB and ChromaDB vector persistence
│   └── main.py               # Application entry point
│
├── frontend/                 # React Application
│   ├── src/
│   │   ├── components/       # UI Components (Sidebar, Chat, Quiz, MockExam, VisualEngine, etc.)
│   │   ├── utils/            # api.js client wrapper
│   │   └── App.jsx           # Main application router and state
│   └── index.css             # Global styles and design system
│
└── .env                      # Environment configurations
```

---

## 🟢 Live Deployment
This project is fully deployed and accessible on the web! The React frontend is hosted on **Vercel** for blazing fast UI delivery, while the FastAPI backend and AI processing engine run on a dedicated **Hugging Face Spaces** Docker container.

---

<div align="center">
  <i>Built with ❤️ for lifelong learners.</i>
</div>
