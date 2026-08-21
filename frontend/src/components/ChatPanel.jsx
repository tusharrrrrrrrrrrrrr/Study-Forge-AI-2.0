import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { api } from '../utils/api';
import RateLimitError from './animations/RateLimitError';

export default function ChatPanel({ docId, docTitle, showToast }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [errorState, setErrorState] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (docId) loadHistory();
  }, [docId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadHistory = async () => {
    try {
      const data = await api.getChatHistory(docId);
      setMessages(
        (data.messages || []).map((m) => ({
          role: m.role,
          content: m.content,
          sources: m.sources || [],
        }))
      );
    } catch {
      // No history yet
    }
  };

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    setInput('');
    setSuggestedQuestions([]);
    setMessages((prev) => [...prev, { role: 'user', content: msg, sources: [] }]);
    setLoading(true);

    try {
      const data = await api.chat(docId, msg, webSearchEnabled);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.response,
          sources: data.sources || [],
        },
      ]);
      setSuggestedQuestions(data.suggested_questions || []);
    } catch (err) {
      if (err.message.includes('RetryError') || err.message.includes('ClientError') || err.message.includes('503') || err.message.includes('429')) {
        setErrorState('rate_limit');
        // Revert the temporary user message so they can retry cleanly
        setMessages((prev) => prev.slice(0, -1));
        setInput(msg); // Put the text back in the input box
      } else {
        showToast(`Chat error: ${err.message}`, 'error');
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: '⚠️ Sorry, something went wrong. Please try again.',
            sources: [],
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    try {
      await api.clearChatHistory(docId);
      setMessages([]);
      setSuggestedQuestions([]);
      showToast('Chat history cleared', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>💬 Chat with Document</h1>
          <div className="subtitle">{docTitle || 'Ask anything about your document'}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={clearHistory}>
          🗑️ Clear History
        </button>
      </div>

      <div className="chat-container">
        {errorState === 'rate_limit' ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RateLimitError onRetry={() => { 
              setErrorState(null); 
              sendMessage(input); 
            }} />
          </div>
        ) : (
          <div className="chat-messages">
            {messages.length === 0 && !loading && (
              <div className="empty-state" style={{ paddingTop: '80px' }}>
              <div className="empty-icon">💬</div>
              <h3>Start a conversation</h3>
              <p>Ask questions about your document and get AI-powered answers with page citations.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16, justifyContent: 'center' }}>
                {['Summarize the main ideas', 'What are the key concepts?', 'Explain the most important topic'].map((q) => (
                  <button key={q} className="suggested-q" onClick={() => sendMessage(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`chat-message ${msg.role}`}>
              <div className="chat-avatar">
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>
              <div>
                <div className="chat-bubble">
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="chat-sources">
                    {msg.sources.map((s, j) => (
                      <span key={j} className="source-tag">
                        📄 Page {s.page} — {s.section}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="chat-message assistant">
              <div className="chat-avatar">🤖</div>
              <div className="chat-bubble">
                <div className="loading-spinner" style={{ padding: '8px 0', flexDirection: 'row', gap: 8 }}>
                  <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div>
                  <span className="loading-text">Analyzing document...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
          </div>
        )}

        {suggestedQuestions.length > 0 && !errorState && (
          <div className="suggested-questions">
            {suggestedQuestions.map((q, i) => (
              <button key={i} className="suggested-q" onClick={() => sendMessage(q)}>
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="chat-input-bar">
          <button
            className={`btn btn-icon ${webSearchEnabled ? 'btn-glow-cyan' : 'btn-ghost'}`}
            onClick={() => setWebSearchEnabled(!webSearchEnabled)}
            title={webSearchEnabled ? 'Web Grounding Enabled' : 'Enable Web Grounding'}
            style={{
              padding: '8px',
              border: webSearchEnabled ? '1px solid var(--primary)' : '1px solid var(--border)',
              backgroundColor: webSearchEnabled ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
              boxShadow: webSearchEnabled ? '0 0 10px rgba(0, 240, 255, 0.3)' : 'none',
              transition: 'all 0.3s ease'
            }}
          >
            🌐
          </button>
          <input
            className="input"
            type="text"
            placeholder={webSearchEnabled ? "Ask anything (Web Search Enabled)..." : "Ask anything about your document..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button
            className="btn btn-primary"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
          >
            {loading ? '⏳' : '📨'} Send
          </button>
        </div>
      </div>
    </>
  );
}
