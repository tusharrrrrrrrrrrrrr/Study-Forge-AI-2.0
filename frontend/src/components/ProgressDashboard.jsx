import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export default function ProgressDashboard({ docId, docTitle }) {
  const [progress, setProgress] = useState(null);
  const [overall, setOverall] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, [docId]);

  const loadProgress = async () => {
    setLoading(true);
    try {
      const overallData = await api.getOverallProgress();
      setOverall(overallData);

      if (docId) {
        const docProgress = await api.getProgress(docId);
        setProgress(docProgress);
      }
    } catch {
      // No data yet
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner" style={{ flex: 1 }}>
        <div className="spinner"></div>
        <div className="loading-text">Loading progress data...</div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>📊 Learning Dashboard</h1>
          <div className="subtitle">{docId ? docTitle : 'Overall progress across all documents'}</div>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-icon">📄</div>
          <div className="stat-value">{overall?.total_documents || 0}</div>
          <div className="stat-label">Documents</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🧪</div>
          <div className="stat-value">{overall?.total_quizzes_taken || 0}</div>
          <div className="stat-label">Quizzes Taken</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{overall?.overall_avg_score || 0}%</div>
          <div className="stat-label">Avg Quiz Score</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💬</div>
          <div className="stat-value">{overall?.total_chat_messages || 0}</div>
          <div className="stat-label">Chat Messages</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🃏</div>
          <div className="stat-value">{overall?.total_flashcards_reviewed || 0}</div>
          <div className="stat-label">Cards Reviewed</div>
        </div>
      </div>

      {/* Document-specific progress */}
      {progress && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
            📄 {progress.doc_title}
          </h2>

          <div className="dashboard-grid">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-value">{progress.average_quiz_score || 0}%</div>
              <div className="stat-label">Avg Score (This Doc)</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💬</div>
              <div className="stat-value">{progress.chat_message_count || 0}</div>
              <div className="stat-label">Messages</div>
            </div>
          </div>

          {/* Quiz History */}
          {progress.quiz_history && progress.quiz_history.length > 0 && (
            <div className="glass-card-static" style={{ marginTop: 16 }}>
              <h3 style={{ marginBottom: 16, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                🧪 Quiz History
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {progress.quiz_history.map((q, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 16px',
                      background: 'var(--bg-glass)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div style={{ fontSize: '0.85rem' }}>
                      {q.correct_answers}/{q.total_questions} correct
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div
                        style={{
                          width: 100,
                          height: 6,
                          background: 'var(--bg-tertiary)',
                          borderRadius: 'var(--radius-full)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${q.score_percent}%`,
                            height: '100%',
                            background: q.score_percent >= 80
                              ? 'var(--accent-green)'
                              : q.score_percent >= 60
                              ? 'var(--accent-orange)'
                              : 'var(--accent-red)',
                            borderRadius: 'var(--radius-full)',
                          }}
                        ></div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: q.score_percent >= 80
                            ? 'var(--accent-green-light)'
                            : q.score_percent >= 60
                            ? 'var(--accent-orange)'
                            : 'var(--accent-red)',
                        }}
                      >
                        {q.score_percent}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flashcard Mastery */}
          {progress.flashcard_mastery && Object.keys(progress.flashcard_mastery).length > 0 && (
            <div className="glass-card-static" style={{ marginTop: 16 }}>
              <h3 style={{ marginBottom: 16, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                🃏 Flashcard Mastery
              </h3>
              <div style={{ display: 'flex', gap: 16 }}>
                {Object.entries(progress.flashcard_mastery).map(([level, count]) => (
                  <div key={level} style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      color: level === 'mastered' ? 'var(--accent-green-light)' :
                             level === 'learning' ? 'var(--accent-orange)' :
                             'var(--text-muted)',
                    }}>
                      {count}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                      {level}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!progress && !docId && overall?.documents?.length > 0 && (
        <div className="glass-card-static" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 16, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            📄 Your Documents
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {overall.documents.map((doc) => (
              <div
                key={doc.id}
                style={{
                  padding: '10px 16px',
                  background: 'var(--bg-glass)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>{doc.title}</span>
                <span style={{ color: 'var(--text-muted)' }}>{doc.pages} pages</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
