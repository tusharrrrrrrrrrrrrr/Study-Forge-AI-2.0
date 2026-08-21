import { useState } from 'react';
import { api } from '../utils/api';

const NAV_ITEMS = [
  { id: 'home', icon: '🏠', label: 'Home' },
  { id: 'upload', icon: '📤', label: 'Upload PDF' },
];

const STUDY_ITEMS = [
  { id: 'chat', icon: '💬', label: 'Chat with Workspace' },
  { id: 'summary', icon: '📝', label: 'Summaries' },
  { id: 'flashcards', icon: '🃏', label: 'Flashcards' },
  { id: 'quiz', icon: '🧪', label: 'Quiz' },
  { id: 'mock_exam', icon: '🎓', label: 'Mock Exam' },
  { id: 'concepts', icon: '🧠', label: 'Concept Map' },
  { id: 'visuals', icon: '🎨', label: 'Visuals & Mnemonics' },
  { id: 'dashboard', icon: '📊', label: 'Progress' },
];

export default function Sidebar({ 
  activeView, 
  onNavigate, 
  workspaces, 
  activeWorkspace, 
  onSelectWorkspace, 
  onDeleteWorkspace,
  onCreateWorkspace,
  onDeleteDocument 
}) {
  const [hoveredWs, setHoveredWs] = useState(null);
  const [hoveredDoc, setHoveredDoc] = useState(null);

  return (
    <aside className="sidebar" style={{ overflowY: 'auto' }}>
      <div className="sidebar-header">
        <div className="sidebar-logo">SF</div>
        <div className="sidebar-brand">
          <h2>StudyForge</h2>
          <span>AI Study Assistant</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
        {NAV_ITEMS.map((item) => (
          <div
            key={item.id}
            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}

        <div className="sidebar-section-label" style={{ marginTop: 8 }}>Study Tools</div>
        {STUDY_ITEMS.map((item) => (
          <div
            key={item.id}
            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}

        <div className="sidebar-section-label" style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Workspaces
          <button 
            style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer' }}
            onClick={() => onCreateWorkspace(`Workspace ${new Date().toLocaleDateString()}`)}
            title="Create Workspace"
          >
            ➕
          </button>
        </div>
        
        {workspaces.map((ws) => (
          <div key={ws.id}>
            <div
              className={`nav-item ${activeWorkspace?.id === ws.id ? 'active' : ''}`}
              onClick={() => onSelectWorkspace(ws)}
              onMouseEnter={() => setHoveredWs(ws.id)}
              onMouseLeave={() => setHoveredWs(null)}
              style={{ position: 'relative' }}
            >
              <span className="nav-icon">📁</span>
              <span style={{ 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap',
                flex: 1,
                fontSize: '0.8rem'
              }}>
                {ws.name}
              </span>
              {hoveredWs === ws.id && (
                <span
                  onClick={(e) => { e.stopPropagation(); onDeleteWorkspace(ws.id); }}
                  style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--accent-red)',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    borderRadius: '4px',
                  }}
                  title="Delete Workspace"
                >
                  ✕
                </span>
              )}
            </div>
            
            {/* Documents inside Workspace */}
            {activeWorkspace?.id === ws.id && ws.documents?.length > 0 && (
              <div style={{ paddingLeft: 20, marginBottom: 8 }}>
                {ws.documents.map(doc => (
                  <div 
                    key={doc.id} 
                    className="nav-item"
                    style={{ padding: '4px 8px', minHeight: 24 }}
                    onMouseEnter={() => setHoveredDoc(doc.id)}
                    onMouseLeave={() => setHoveredDoc(null)}
                  >
                    <span className="nav-icon" style={{ fontSize: '0.8rem' }}>📄</span>
                    <span style={{ 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap',
                      flex: 1,
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)'
                    }}>
                      {doc.filename}
                    </span>
                    {hoveredDoc === doc.id && (
                      <span
                        onClick={(e) => { e.stopPropagation(); onDeleteDocument(doc.id); }}
                        style={{ 
                          fontSize: '0.75rem', 
                          color: 'var(--accent-red)',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          borderRadius: '4px',
                        }}
                        title="Delete Document"
                      >
                        ✕
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {activeWorkspace && (
          <div className="doc-indicator">
            <div className="dot"></div>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeWorkspace.name}
            </span>
          </div>
        )}
        <button 
          className="btn btn-secondary" 
          style={{ width: '100%', fontSize: '0.8rem', padding: '6px' }} 
          onClick={() => api.logout()}
        >
          🚪 Logout
        </button>
      </div>
    </aside>
  );
}
