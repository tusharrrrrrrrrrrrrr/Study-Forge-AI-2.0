import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import FileUpload from './components/FileUpload';
import ChatPanel from './components/ChatPanel';
import FlashcardDeck from './components/FlashcardDeck';
import QuizEngine from './components/QuizEngine';
import MockExamEngine from './components/MockExamEngine';
import SummaryView from './components/SummaryView';
import ConceptMap from './components/ConceptMap';
import VisualEngine from './components/VisualEngine';
import ProgressDashboard from './components/ProgressDashboard';
import AuthPage from './components/AuthPage';
import { api, isAuthenticated } from './utils/api';

function App() {
  const [auth, setAuth] = useState(isAuthenticated());
  const [activeView, setActiveView] = useState('home');
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      const data = await api.getWorkspaces();
      setWorkspaces(data.workspaces || []);
      
      // Update active workspace if it exists to get new documents
      setActiveWorkspace(prev => {
        if (!prev) return null;
        const updated = data.workspaces?.find(w => w.id === prev.id);
        return updated || null;
      });
    } catch (err) {
      console.log('Backend not available:', err.message);
    }
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCreateWorkspace = async (name) => {
    try {
      const newWs = await api.createWorkspace(name);
      await loadWorkspaces();
      setActiveWorkspace(newWs);
      setActiveView('upload');
      showToast('Workspace created!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleUploadComplete = async () => {
    await loadWorkspaces();
    setActiveView('chat');
    showToast(`Document uploaded successfully!`, 'success');
  };

  const handleSelectWorkspace = (ws) => {
    setActiveWorkspace(ws);
    if (activeView === 'home' || activeView === 'upload') {
      setActiveView('chat');
    }
  };

  const handleDeleteWorkspace = async (wsId) => {
    try {
      await api.deleteWorkspace(wsId);
      setWorkspaces((prev) => prev.filter((w) => w.id !== wsId));
      if (activeWorkspace?.id === wsId) {
        setActiveWorkspace(null);
        setActiveView('home');
      }
      showToast('Workspace deleted', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
  
  const handleDeleteDocument = async (docId) => {
    try {
      await api.deleteDocument(docId);
      await loadWorkspaces();
      showToast('Document deleted', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const renderView = () => {
    const wsId = activeWorkspace?.id;

    if (activeView === 'upload') {
      if (!wsId) {
        return (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <h3>Create a Workspace First</h3>
            <p>You need a workspace to upload documents into.</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => handleCreateWorkspace(new Date().toLocaleString())}>
              ➕ Create Workspace
            </button>
          </div>
        );
      }
      return <FileUpload workspaceId={wsId} onUploadComplete={handleUploadComplete} showToast={showToast} />;
    }

    if (!wsId && activeView !== 'home' && activeView !== 'dashboard') {
      return (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h3>No Workspace Selected</h3>
          <p>Create a workspace and upload a PDF to start studying.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => handleCreateWorkspace(`Workspace ${new Date().toLocaleDateString()}`)}>
            ➕ Create Workspace
          </button>
        </div>
      );
    }

    switch (activeView) {
      case 'chat':
        return <ChatPanel docId={wsId} docTitle={activeWorkspace?.name} showToast={showToast} />;
      case 'summary':
        return <SummaryView docId={wsId} docTitle={activeWorkspace?.name} showToast={showToast} />;
      case 'flashcards':
        return <FlashcardDeck docId={wsId} docTitle={activeWorkspace?.name} showToast={showToast} />;
      case 'quiz':
        return <QuizEngine docId={wsId} docTitle={activeWorkspace?.name} showToast={showToast} />;
      case 'mock_exam':
        return <MockExamEngine docId={wsId} docTitle={activeWorkspace?.name} showToast={showToast} />;
      case 'concepts':
        return <ConceptMap docId={wsId} docTitle={activeWorkspace?.name} showToast={showToast} />;
      case 'visuals':
        return <VisualEngine docId={wsId} docTitle={activeWorkspace?.name} showToast={showToast} />;
      case 'dashboard':
        return <ProgressDashboard docId={wsId} docTitle={activeWorkspace?.name} />;
      default:
        return <WelcomeView onCreateWorkspace={() => handleCreateWorkspace(`Workspace ${new Date().toLocaleDateString()}`)} />;
    }
  };

  if (!auth) {
    return <AuthPage onLoginSuccess={() => setAuth(true)} />;
  }

  return (
    <div className="app-layout">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={handleSelectWorkspace}
        onDeleteWorkspace={handleDeleteWorkspace}
        onCreateWorkspace={handleCreateWorkspace}
        onDeleteDocument={handleDeleteDocument}
      />
      <main className="main-content">
        {renderView()}
      </main>
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}


function WelcomeView({ onCreateWorkspace }) {
  return (
    <div className="welcome-container">
      <div className="welcome-hero">
        <h1>Welcome to StudyForge AI</h1>
        <p>Create a workspace, upload multiple PDFs — and let AI transform them into an interactive study experience.</p>
      </div>

      <button className="btn btn-primary btn-lg" onClick={onCreateWorkspace}>
        ➕ Create New Workspace
      </button>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">💬</div>
          <h3>Chat with Documents</h3>
          <p>Ask any question and get answers with page citations</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📝</div>
          <h3>Smart Summaries</h3>
          <p>Full, chapter-wise, ELI5, and key terms modes</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🃏</div>
          <h3>AI Flashcards</h3>
          <p>Auto-generated flashcards with flip animations</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🧪</div>
          <h3>Quiz Generator</h3>
          <p>MCQ, True/False & short answer with instant grading</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🎓</div>
          <h3>Mock Exams</h3>
          <p>Timed, rigorous practice tests with AI rubric grading</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🧠</div>
          <h3>Concept Maps</h3>
          <p>Visual concept relationships extracted from your content</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🎨</div>
          <h3>Visuals & Mnemonics</h3>
          <p>AI generated diagrams and creative memory tricks</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <h3>Progress Tracking</h3>
          <p>Track scores, mastery, and study time</p>
        </div>
      </div>
    </div>
  );
}

export default App;
