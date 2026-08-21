import { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import RateLimitError from './animations/RateLimitError';

export default function MockExamEngine({ docId, docTitle, showToast }) {
  const [examState, setExamState] = useState('setup'); // setup, loading, active, grading, results
  const [duration, setDuration] = useState(30);
  const [examData, setExamData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [resultsData, setResultsData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [errorState, setErrorState] = useState(null);

  const timerRef = useRef(null);

  useEffect(() => {
    if (examState === 'active' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            submitExam(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [examState, timeLeft]);

  const generateExam = async () => {
    setExamState('loading');
    setErrorState(null);
    try {
      const data = await api.getMockExam(docId, duration);
      setExamData(data);
      setTimeLeft(duration * 60);
      setAnswers({});
      setExamState('active');
    } catch (err) {
      if (err.message.includes('RetryError') || err.message.includes('ClientError') || err.message.includes('503') || err.message.includes('429')) {
        setErrorState('rate_limit');
      } else {
        showToast(`Exam generation failed: ${err.message}`, 'error');
        setExamState('setup');
      }
    }
  };

  const submitExam = async (autoSubmitted = false) => {
    clearInterval(timerRef.current);
    if (autoSubmitted) {
      showToast('Time is up! Auto-submitting exam...', 'info');
    }
    
    setExamState('grading');
    setErrorState(null);

    const submissionAnswers = examData.questions.map((q, idx) => ({
      question_index: idx,
      question: q.question,
      type: q.type,
      points: q.points,
      user_answer: answers[idx] || ""
    }));

    try {
      const results = await api.submitMockExam(docId, submissionAnswers);
      setResultsData(results);
      setExamState('results');
    } catch (err) {
      if (err.message.includes('RetryError') || err.message.includes('ClientError') || err.message.includes('503') || err.message.includes('429')) {
        setErrorState('rate_limit');
      } else {
        showToast(`Grading failed: ${err.message}`, 'error');
        setExamState('active');
      }
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleAnswerChange = (idx, val) => {
    setAnswers(prev => ({ ...prev, [idx]: val }));
  };

  if (errorState === 'rate_limit') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="page-header">
          <div>
            <h1>📝 Mock Exam</h1>
            <div className="subtitle">{docTitle}</div>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RateLimitError onRetry={() => { 
            setErrorState(null); 
            if (examState === 'loading') generateExam();
            if (examState === 'grading') submitExam();
          }} />
        </div>
      </div>
    );
  }

  if (examState === 'loading' || examState === 'grading') {
    return (
      <div className="loading-spinner" style={{ flex: 1 }}>
        <div className="spinner"></div>
        <div className="loading-text">
          <h2>{examState === 'loading' ? 'Generating Mock Exam...' : 'AI is Grading your Exam...'}</h2>
          <p>{examState === 'loading' ? 'Extracting concepts and formulating rigorous questions.' : 'Evaluating your answers against the core material.'}</p>
        </div>
      </div>
    );
  }

  if (examState === 'setup') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="page-header">
          <div>
            <h1>📝 Mock Exam Simulator</h1>
            <div className="subtitle">{docTitle}</div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="glass-panel" style={{ maxWidth: 500, width: '100%', textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: '3rem', marginBottom: 20 }}>⏱️</div>
            <h2>Ready to test yourself?</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 30 }}>
              The AI will generate a realistic, timed exam based on your document with a mix of multiple-choice, short answer, and essay questions.
            </p>

            <div style={{ marginBottom: 30 }}>
              <label style={{ display: 'block', marginBottom: 10, color: 'var(--text-muted)' }}>Select Time Limit:</label>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                {[15, 30, 60].map(mins => (
                  <button
                    key={mins}
                    className={`btn ${duration === mins ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setDuration(mins)}
                  >
                    {mins} mins
                  </button>
                ))}
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={generateExam}
              style={{ width: '100%', justifyContent: 'center', fontSize: '1.1rem', padding: '12px' }}
            >
              Start Exam
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (examState === 'active') {
    const isLowTime = timeLeft < 60; // less than 1 min
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>📝 Mock Exam in Progress</h1>
            <div className="subtitle">{docTitle}</div>
          </div>
          <div style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            color: isLowTime ? 'var(--accent-red)' : 'var(--text-primary)',
            padding: '10px 20px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '8px',
            border: `1px solid ${isLowTime ? 'var(--accent-red)' : 'var(--border)'}`,
            animation: isLowTime ? 'pulse 1s infinite' : 'none'
          }}>
            ⏱️ {formatTime(timeLeft)}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 30 }}>
            {examData.questions.map((q, idx) => (
              <div key={idx} className="glass-panel" style={{ padding: 25 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Question {idx + 1}</span>
                  <span style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>{q.points} {q.points === 1 ? 'pt' : 'pts'}</span>
                </div>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', lineHeight: 1.5 }}>
                  {q.question}
                </h3>

                {q.type === 'mcq' && q.options && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {q.options.map((opt, oIdx) => (
                      <label key={oIdx} style={{ 
                        display: 'flex', alignItems: 'center', gap: 12, 
                        padding: 15, background: 'rgba(255,255,255,0.03)', 
                        borderRadius: 8, cursor: 'pointer',
                        border: answers[idx] === opt ? '1px solid var(--primary)' : '1px solid transparent'
                      }}>
                        <input
                          type="radio"
                          name={`q-${idx}`}
                          value={opt}
                          checked={answers[idx] === opt}
                          onChange={(e) => handleAnswerChange(idx, e.target.value)}
                          style={{ margin: 0 }}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {(q.type === 'short_answer' || q.type === 'essay') && (
                  <textarea
                    className="input"
                    rows={q.type === 'essay' ? 6 : 3}
                    placeholder="Type your answer here..."
                    value={answers[idx] || ""}
                    onChange={(e) => handleAnswerChange(idx, e.target.value)}
                    style={{ width: '100%', resize: 'vertical' }}
                  ></textarea>
                )}
              </div>
            ))}

            <button 
              className="btn btn-primary btn-lg" 
              onClick={() => submitExam(false)}
              style={{ justifyContent: 'center', marginTop: 20 }}
            >
              Submit Exam for Grading
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (examState === 'results') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>📊 Exam Results</h1>
            <div className="subtitle">{docTitle}</div>
          </div>
          <button className="btn btn-ghost" onClick={() => setExamState('setup')}>
            🔄 Take Another Exam
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 30 }}>
            
            <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
              <h2 style={{ margin: '0 0 10px 0' }}>Final Grade</h2>
              <div style={{ 
                fontSize: '4rem', 
                fontWeight: 'bold', 
                color: resultsData.percentage >= 80 ? 'var(--accent-green)' : (resultsData.percentage >= 60 ? 'var(--accent-yellow)' : 'var(--accent-red)') 
              }}>
                {resultsData.percentage.toFixed(0)}%
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', margin: '10px 0 0 0' }}>
                {resultsData.total_score} / {resultsData.max_total_score} Points
              </p>
            </div>

            <h3 style={{ margin: '20px 0 0 0', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
              Detailed Feedback
            </h3>

            {resultsData.results.map((res, idx) => {
              const isPerfect = res.score === res.max_score;
              return (
                <div key={idx} className="glass-panel" style={{ padding: 25, borderLeft: `4px solid ${isPerfect ? 'var(--accent-green)' : (res.score > 0 ? 'var(--accent-yellow)' : 'var(--accent-red)')}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Question {res.question_index + 1}</span>
                    <span style={{ fontWeight: 'bold' }}>Score: {res.score} / {res.max_score}</span>
                  </div>
                  <h4 style={{ margin: '0 0 15px 0', fontSize: '1.1rem' }}>{res.question}</h4>
                  
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: 15, borderRadius: 8, marginBottom: 15 }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 5 }}>Your Answer:</div>
                    <div>{res.user_answer || <i>(No answer provided)</i>}</div>
                  </div>

                  {!isPerfect && (
                    <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: 15, borderRadius: 8, marginBottom: 15 }}>
                      <div style={{ color: 'var(--accent-green)', fontSize: '0.85rem', marginBottom: 5 }}>Ideal Answer:</div>
                      <div>{res.correct_answer}</div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '1.2rem' }}>👨‍🏫</span>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {res.feedback}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
