import React from 'react';
import './animations.css';

export default function RateLimitError({ onRetry }) {
  return (
    <div className="rate-limit-error-container">
      <div className="robot-bitten-animation">
        <div className="book-jaw top-jaw">📖</div>
        <div className="scared-robot">🤖</div>
        <div className="book-jaw bottom-jaw">📚</div>
      </div>
      <h3 style={{ marginBottom: 12, color: 'var(--accent-red)' }}>Ouch! The AI got bitten by the Rate Limit!</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 8, fontSize: '0.9rem' }}>
        Google Gemini is currently experiencing extremely high demand, so our request was temporarily rejected (Error 503/429).
      </p>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.9rem' }}>
        Don't worry, the robot just needs a few seconds to recover.
      </p>
      <button className="btn btn-primary" onClick={onRetry}>
        🔄 Try Again
      </button>
    </div>
  );
}
