import { useState } from 'react';
import { api } from '../utils/api';
import RateLimitError from './animations/RateLimitError';

export default function FlashcardDeck({ docId, docTitle, showToast }) {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState('mixed');
  const [generated, setGenerated] = useState(false);
  const [errorState, setErrorState] = useState(null);

  const generateCards = async () => {
    setLoading(true);
    setCards([]);
    setCurrentIndex(0);
    setFlipped(false);

    try {
      const data = await api.getFlashcards(docId, count, difficulty);
      setCards(data.flashcards || []);
      setGenerated(true);
      setErrorState(null);
    } catch (err) {
      if (err.message.includes('RetryError') || err.message.includes('ClientError') || err.message.includes('503') || err.message.includes('429')) {
        setErrorState('rate_limit');
      } else {
        showToast(`Flashcard generation failed: ${err.message}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const nextCard = () => {
    setFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => Math.min(prev + 1, cards.length - 1));
    }, 150);
  };

  const prevCard = () => {
    setFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => Math.max(prev - 1, 0));
    }, 150);
  };

  const markMastery = async (mastery) => {
    try {
      await api.updateFlashcardProgress(docId, currentIndex, mastery);
    } catch {
      // Non-critical, continue
    }
    nextCard();
  };

  const currentCard = cards[currentIndex];

  if (errorState === 'rate_limit') {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <RateLimitError onRetry={() => { setErrorState(null); generateCards(); }} />
      </div>
    );
  }

  if (!generated) {
    return (
      <>
        <div className="page-header">
          <div>
            <h1>🃏 AI Flashcards</h1>
            <div className="subtitle">{docTitle || 'Generate flashcards from your document'}</div>
          </div>
        </div>

        <div className="flashcard-deck">
          <div className="glass-card" style={{ maxWidth: 500, width: '100%', textAlign: 'center' }}>
            <h3 style={{ marginBottom: 16 }}>Configure Flashcards</h3>

            <div className="config-row" style={{ justifyContent: 'center', marginBottom: 12 }}>
              <label>Count</label>
              <select className="input" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                <option value={5}>5 cards</option>
                <option value={10}>10 cards</option>
                <option value={15}>15 cards</option>
                <option value={20}>20 cards</option>
              </select>
            </div>

            <div className="config-row" style={{ justifyContent: 'center', marginBottom: 24 }}>
              <label>Difficulty</label>
              <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option value="easy">Easy</option>
                <option value="mixed">Mixed</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <button className="btn btn-primary btn-lg" onClick={generateCards} disabled={loading}>
              {loading ? '⏳ Generating...' : '🃏 Generate Flashcards'}
            </button>
          </div>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <div className="loading-spinner" style={{ flex: 1 }}>
        <div className="spinner"></div>
        <div className="loading-text">Generating flashcards from your document...</div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🃏</div>
        <h3>No flashcards generated</h3>
        <p>Try again with different settings.</p>
        <button className="btn btn-primary" onClick={() => setGenerated(false)} style={{ marginTop: 16 }}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>🃏 AI Flashcards</h1>
          <div className="subtitle">{docTitle}</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setGenerated(false)}>
          ⚙️ New Set
        </button>
      </div>

      <div className="flashcard-deck">
        <div className={`flashcard ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped(!flipped)}>
          <div className="flashcard-inner">
            <div className="flashcard-face flashcard-front">
              <div className="flashcard-label">Question</div>
              <div className="flashcard-text">{currentCard.front}</div>
              <div className="flashcard-meta">
                <span className={`difficulty-badge difficulty-${currentCard.difficulty}`}>
                  {currentCard.difficulty}
                </span>
                {currentCard.topic && <span>{currentCard.topic}</span>}
                {currentCard.source_page && <span>📄 Page {currentCard.source_page}</span>}
              </div>
            </div>
            <div className="flashcard-face flashcard-back">
              <div className="flashcard-label">Answer</div>
              <div className="flashcard-text">{currentCard.back}</div>
              <div className="flashcard-meta">
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Click to flip back</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flashcard-controls">
          <button className="btn btn-secondary btn-sm" onClick={prevCard} disabled={currentIndex === 0}>
            ← Prev
          </button>
          <div className="flashcard-counter">
            {currentIndex + 1} / {cards.length}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={nextCard} disabled={currentIndex === cards.length - 1}>
            Next →
          </button>
        </div>

        {flipped && (
          <div style={{ display: 'flex', gap: 8, animation: 'messageIn 0.3s ease' }}>
            <button className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green-light)', border: '1px solid rgba(16,185,129,0.3)' }} onClick={() => markMastery('mastered')}>
              ✅ Easy
            </button>
            <button className="btn btn-sm" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--accent-orange)', border: '1px solid rgba(245,158,11,0.3)' }} onClick={() => markMastery('learning')}>
              🔄 Medium
            </button>
            <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)', border: '1px solid rgba(239,68,68,0.3)' }} onClick={() => markMastery('new')}>
              ❌ Hard
            </button>
          </div>
        )}
      </div>
    </>
  );
}
