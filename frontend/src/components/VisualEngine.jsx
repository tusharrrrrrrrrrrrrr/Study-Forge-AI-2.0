import { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { api } from '../utils/api';
import RateLimitError from './animations/RateLimitError';

function MermaidChart({ chart }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current && chart) {
      mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
      // Clear previous
      containerRef.current.innerHTML = '';
      
      const renderChart = async () => {
        try {
          // generate a unique id for the svg
          const id = `mermaid-svg-${Math.random().toString(36).substr(2, 9)}`;
          const { svg } = await mermaid.render(id, chart);
          if (containerRef.current) {
            containerRef.current.innerHTML = svg;
          }
        } catch (err) {
          if (containerRef.current) {
            containerRef.current.innerHTML = `<div style="color: #ff6b6b; padding: 20px; text-align: center;">Failed to render diagram. The AI generated invalid Mermaid syntax.<br/><br/><code>${err.message}</code></div>`;
          }
        }
      };
      
      renderChart();
    }
  }, [chart]);

  return <div ref={containerRef} style={{ width: '100%', overflow: 'auto', display: 'flex', justifyContent: 'center', minHeight: '300px' }} />;
}

export default function VisualEngine({ docId, docTitle, showToast }) {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [visualData, setVisualData] = useState(null);
  const [errorState, setErrorState] = useState(null);

  const generateVisuals = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const data = await api.getVisuals(docId, topic.trim() || null);
      setVisualData(data);
      setGenerated(true);
    } catch (err) {
      if (err.message.includes('RetryError') || err.message.includes('ClientError') || err.message.includes('503') || err.message.includes('429')) {
        setErrorState('rate_limit');
      } else {
        showToast(`Visual generation failed: ${err.message}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      generateVisuals();
    }
  };

  if (errorState === 'rate_limit') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="page-header">
          <div>
            <h1>🎨 Visuals & Mnemonics</h1>
            <div className="subtitle">{docTitle}</div>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RateLimitError onRetry={() => { setErrorState(null); generateVisuals(); }} />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-spinner" style={{ flex: 1 }}>
        <div className="spinner"></div>
        <div className="loading-text">
          <h2>Designing Visuals...</h2>
          <p>Generating flowcharts and creative memory tricks...</p>
        </div>
      </div>
    );
  }

  if (!generated) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="page-header">
          <div>
            <h1>🎨 Visuals & Mnemonics</h1>
            <div className="subtitle">{docTitle}</div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="glass-panel" style={{ maxWidth: 600, width: '100%', textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: '3rem', marginBottom: 20 }}>🧠</div>
            <h2>Visualize Your Study Material</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 30 }}>
              Let AI extract the core concepts and workflows from your document and transform them into flowcharts and clever mnemonic memory tricks.
            </p>

            <div style={{ marginBottom: 20 }}>
              <input
                className="input"
                type="text"
                placeholder="Optional: Focus on a specific topic (e.g. 'Photosynthesis')"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ width: '100%', marginBottom: 15 }}
              />
            </div>

            <button
              className="btn btn-primary"
              onClick={generateVisuals}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Generate Visuals
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 20, overflow: 'hidden' }}>
      <div className="page-header">
        <div>
          <h1>🎨 Visuals & Mnemonics</h1>
          <div className="subtitle">{docTitle}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setGenerated(false)}>
          🔄 Generate Another
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, flex: 1, minHeight: 0 }}>
        {/* Left Side: Diagram */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(255, 255, 255, 0.02)' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>📊</span> Flowchart Diagram
            </h3>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a24' }}>
            <MermaidChart chart={visualData?.mermaid_code} />
          </div>
        </div>

        {/* Right Side: Mnemonic */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, overflow: 'auto' }}>
          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--primary)' }}>
              <span>💡</span> Mnemonic Device
            </h3>
            <p style={{ fontSize: '1.1rem', lineHeight: 1.6 }}>
              {visualData?.mnemonic}
            </p>
          </div>

          <div className="glass-panel" style={{ padding: 20, flex: 1 }}>
            <h3 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--secondary)' }}>
              <span>📖</span> Explanation
            </h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {visualData?.explanation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
