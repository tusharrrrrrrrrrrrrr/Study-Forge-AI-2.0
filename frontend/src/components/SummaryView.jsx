import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { api } from '../utils/api';
import RateLimitError from './animations/RateLimitError';

const MODES = [
  { id: 'full', label: '📋 Full Summary', desc: 'Comprehensive overview' },
  { id: 'chapter', label: '📖 Chapter-wise', desc: 'Section by section' },
  { id: 'eli5', label: '🧒 ELI5', desc: 'Explain Like I\'m 5' },
  { id: 'key_terms', label: '📚 Key Terms', desc: 'Glossary & definitions' },
];

export default function SummaryView({ docId, docTitle, showToast }) {
  const [mode, setMode] = useState('full');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadedMode, setLoadedMode] = useState('');
  const [errorState, setErrorState] = useState(null);

  const generateSummary = async (selectedMode) => {
    setMode(selectedMode);
    setLoading(true);
    setSummary('');

    try {
      const data = await api.getSummary(docId, selectedMode);
      setSummary(data.summary);
      setLoadedMode(selectedMode);
      setErrorState(null);
    } catch (err) {
      if (err.message.includes('RetryError') || err.message.includes('ClientError') || err.message.includes('503') || err.message.includes('429')) {
        setErrorState('rate_limit');
      } else {
        showToast(`Summary failed: ${err.message}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>📝 Smart Summaries</h1>
          <div className="subtitle">{docTitle || 'Generate summaries in different modes'}</div>
        </div>
      </div>

      <div className="summary-mode-tabs">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`mode-tab ${mode === m.id && loadedMode === m.id ? 'active' : ''}`}
            onClick={() => generateSummary(m.id)}
            disabled={loading}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="summary-container">
        {errorState === 'rate_limit' ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RateLimitError onRetry={() => generateSummary(mode)} />
          </div>
        ) : loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <div className="loading-text">
              Generating {MODES.find((m) => m.id === mode)?.desc?.toLowerCase() || 'summary'}...
              <br />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                This may take 10-30 seconds depending on document length
              </span>
            </div>
          </div>
        ) : summary ? (
          <div className="summary-content glass-card-static">
            <ReactMarkdown>{summary}</ReactMarkdown>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3>Choose a summary mode</h3>
            <p>Select a mode above to generate an AI-powered summary of your document.</p>
          </div>
        )}
      </div>
    </>
  );
}
