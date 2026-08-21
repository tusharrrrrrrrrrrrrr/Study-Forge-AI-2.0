import { useState } from 'react';
import { api } from '../utils/api';
import RateLimitError from './animations/RateLimitError';

export default function ConceptMap({ docId, docTitle, showToast }) {
  const [concepts, setConcepts] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [errorState, setErrorState] = useState(null);

  const generateConcepts = async () => {
    setLoading(true);
    try {
      const data = await api.getConcepts(docId);
      setConcepts(data.concepts || []);
      setRelationships(data.relationships || []);
      setGenerated(true);
      setErrorState(null);
    } catch (err) {
      if (err.message.includes('RetryError') || err.message.includes('ClientError') || err.message.includes('503') || err.message.includes('429')) {
        setErrorState('rate_limit');
      } else {
        showToast(`Concept extraction failed: ${err.message}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (errorState === 'rate_limit') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="page-header">
          <div>
            <h1>🧠 Concept Map</h1>
            <div className="subtitle">{docTitle}</div>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RateLimitError onRetry={() => { setErrorState(null); generateConcepts(); }} />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-spinner" style={{ flex: 1 }}>
        <div className="spinner"></div>
        <div className="loading-text">Extracting concepts and relationships...</div>
      </div>
    );
  }

  if (!generated) {
    return (
      <>
        <div className="page-header">
          <div>
            <h1>🧠 Concept Map</h1>
            <div className="subtitle">{docTitle || 'Extract key concepts and relationships'}</div>
          </div>
        </div>

        <div className="flashcard-deck">
          <div className="glass-card" style={{ maxWidth: 500, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🧠</div>
            <h3 style={{ marginBottom: 8 }}>Concept Map Generator</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 24 }}>
              AI will extract key concepts from your document and map their relationships.
            </p>
            <button className="btn btn-primary btn-lg" onClick={generateConcepts}>
              🧠 Extract Concepts
            </button>
          </div>
        </div>
      </>
    );
  }

  // Group by importance
  const high = concepts.filter((c) => c.importance === 'high');
  const medium = concepts.filter((c) => c.importance === 'medium');
  const low = concepts.filter((c) => c.importance === 'low');

  // Get relationships for selected concept
  const selectedRels = selectedConcept
    ? relationships.filter((r) => r.source === selectedConcept.id || r.target === selectedConcept.id)
    : [];

  return (
    <>
      <div className="page-header">
        <div>
          <h1>🧠 Concept Map</h1>
          <div className="subtitle">{docTitle} — {concepts.length} concepts extracted</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setGenerated(false)}>
          🔄 Regenerate
        </button>
      </div>

      <div className="concept-map">
        {/* Concept Nodes */}
        <div className="glass-card-static">
          <h3 style={{ marginBottom: 16, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            🔴 High Importance
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {high.map((c) => (
              <div
                key={c.id}
                className={`concept-node importance-high ${selectedConcept?.id === c.id ? 'active' : ''}`}
                onClick={() => setSelectedConcept(selectedConcept?.id === c.id ? null : c)}
                style={selectedConcept?.id === c.id ? { background: 'rgba(124,58,237,0.2)', boxShadow: 'var(--shadow-glow)' } : {}}
              >
                ⭐ {c.label}
              </div>
            ))}
          </div>
        </div>

        {medium.length > 0 && (
          <div className="glass-card-static">
            <h3 style={{ marginBottom: 16, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              🟡 Medium Importance
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {medium.map((c) => (
                <div
                  key={c.id}
                  className={`concept-node importance-medium`}
                  onClick={() => setSelectedConcept(selectedConcept?.id === c.id ? null : c)}
                  style={selectedConcept?.id === c.id ? { background: 'rgba(6,182,212,0.2)' } : {}}
                >
                  {c.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {low.length > 0 && (
          <div className="glass-card-static">
            <h3 style={{ marginBottom: 16, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              🟢 Supporting Concepts
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {low.map((c) => (
                <div
                  key={c.id}
                  className={`concept-node importance-low`}
                  onClick={() => setSelectedConcept(selectedConcept?.id === c.id ? null : c)}
                  style={selectedConcept?.id === c.id ? { background: 'var(--bg-glass-hover)' } : {}}
                >
                  {c.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Concept Detail */}
        {selectedConcept && (
          <div className="glass-card" style={{ animation: 'messageIn 0.3s ease' }}>
            <h3 style={{ marginBottom: 8, color: 'var(--accent-purple-light)' }}>
              {selectedConcept.label}
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.7 }}>
              {selectedConcept.description}
            </p>

            {selectedRels.length > 0 && (
              <>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                  RELATIONSHIPS
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedRels.map((r, i) => {
                    const isSource = r.source === selectedConcept.id;
                    const otherName = isSource
                      ? concepts.find((c) => c.id === r.target)?.label || r.target
                      : concepts.find((c) => c.id === r.source)?.label || r.source;
                    return (
                      <div
                        key={i}
                        style={{
                          padding: '8px 12px',
                          background: 'var(--bg-glass)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.85rem',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {isSource ? (
                          <><strong style={{ color: 'var(--accent-purple-light)' }}>{selectedConcept.label}</strong> → <em>{r.label}</em> → <strong style={{ color: 'var(--accent-cyan-light)' }}>{otherName}</strong></>
                        ) : (
                          <><strong style={{ color: 'var(--accent-cyan-light)' }}>{otherName}</strong> → <em>{r.label}</em> → <strong style={{ color: 'var(--accent-purple-light)' }}>{selectedConcept.label}</strong></>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Relationships Overview */}
        <div className="glass-card-static">
          <h3 style={{ marginBottom: 16, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            🔗 All Relationships ({relationships.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {relationships.map((r, i) => {
              const sourceName = concepts.find((c) => c.id === r.source)?.label || r.source;
              const targetName = concepts.find((c) => c.id === r.target)?.label || r.target;
              return (
                <div
                  key={i}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    borderLeft: '2px solid var(--border-color)',
                    paddingLeft: 12,
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>{sourceName}</span>
                  {' → '}
                  <em>{r.label}</em>
                  {' → '}
                  <span style={{ color: 'var(--text-secondary)' }}>{targetName}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
