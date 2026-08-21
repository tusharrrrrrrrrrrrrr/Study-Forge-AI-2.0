import { useState } from 'react';
import { api } from '../utils/api';
import RateLimitError from './animations/RateLimitError';

export default function QuizEngine({ docId, docTitle, showToast }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState('mixed');
  const [generated, setGenerated] = useState(false);
  const [errorState, setErrorState] = useState(null);

  const generateQuiz = async () => {
    setLoading(true);
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
    setResults(null);

    try {
      const data = await api.getQuiz(docId, count, difficulty);
      setQuestions(data.questions || []);
      setGenerated(true);
      setErrorState(null);
    } catch (err) {
      if (err.message.includes('RetryError') || err.message.includes('ClientError') || err.message.includes('503') || err.message.includes('429')) {
        setErrorState('rate_limit');
      } else {
        showToast(`Quiz generation failed: ${err.message}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const selectAnswer = (qIndex, answer) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qIndex]: answer }));
  };

  const submitQuiz = async () => {
    const answerList = questions.map((q, i) => ({
      question_index: i,
      user_answer: answers[i] || '',
      correct_answer: q.correct_answer,
      explanation: q.explanation,
    }));

    try {
      const result = await api.submitQuiz(docId, answerList, questions.length);
      setResults(result);
      setSubmitted(true);
    } catch (err) {
      showToast(`Quiz submission failed: ${err.message}`, 'error');
    }
  };

  const resetQuiz = () => {
    setGenerated(false);
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
    setResults(null);
  };

  if (errorState === 'rate_limit') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="page-header">
          <div>
            <h1>🧪 Quiz Generator</h1>
            <div className="subtitle">{docTitle}</div>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RateLimitError onRetry={() => { setErrorState(null); generateQuiz(); }} />
        </div>
      </div>
    );
  }

  if (!generated) {
    return (
      <>
        <div className="page-header">
          <div>
            <h1>🧪 Quiz Generator</h1>
            <div className="subtitle">{docTitle || 'Test your knowledge'}</div>
          </div>
        </div>

        <div className="flashcard-deck">
          <div className="glass-card" style={{ maxWidth: 500, width: '100%', textAlign: 'center' }}>
            <h3 style={{ marginBottom: 16 }}>Configure Quiz</h3>

            <div className="config-row" style={{ justifyContent: 'center', marginBottom: 12 }}>
              <label>Questions</label>
              <select className="input" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                <option value={5}>5 questions</option>
                <option value={10}>10 questions</option>
                <option value={15}>15 questions</option>
                <option value={20}>20 questions</option>
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

            <button className="btn btn-primary btn-lg" onClick={generateQuiz} disabled={loading}>
              {loading ? '⏳ Generating...' : '🧪 Generate Quiz'}
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
        <div className="loading-text">Creating quiz questions from your document...</div>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>🧪 Quiz</h1>
          <div className="subtitle">
            {docTitle} — {answeredCount}/{questions.length} answered
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!submitted && (
            <button
              className="btn btn-primary btn-sm"
              onClick={submitQuiz}
              disabled={answeredCount < questions.length}
            >
              ✅ Submit Quiz
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={resetQuiz}>
            🔄 New Quiz
          </button>
        </div>
      </div>

      {submitted && results && (
        <div className="quiz-score-banner">
          <div className="quiz-score-number">{results.percentage}%</div>
          <div className="quiz-score-label">
            {results.score} of {results.total} correct
            {results.percentage >= 80 ? ' — Excellent! 🎉' :
             results.percentage >= 60 ? ' — Good job! 👍' :
             ' — Keep studying! 📚'}
          </div>
        </div>
      )}

      <div className="quiz-container">
        {questions.map((q, qIndex) => {
          const userAnswer = answers[qIndex];
          const isAnswered = userAnswer !== undefined;
          const resultData = submitted && results?.results?.[qIndex];
          const isCorrect = resultData?.is_correct;

          return (
            <div
              key={qIndex}
              className={`quiz-question-card ${submitted ? (isCorrect ? 'answered-correct' : 'answered-wrong') : ''}`}
            >
              <div className="quiz-q-header">
                <span className="quiz-q-number">Q{qIndex + 1}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className={`difficulty-badge difficulty-${q.difficulty}`}>{q.difficulty}</span>
                  {q.source_page && <span className="source-tag">📄 Page {q.source_page}</span>}
                </div>
              </div>

              <div className="quiz-q-text">{q.question}</div>

              {q.type === 'mcq' && q.options && (
                <div className="quiz-options">
                  {q.options.map((opt, optIndex) => {
                    const letter = String.fromCharCode(65 + optIndex);
                    const isSelected = userAnswer === opt;
                    const isCorrectOption = submitted && opt === q.correct_answer;
                    const isWrongSelection = submitted && isSelected && !isCorrectOption;

                    return (
                      <div
                        key={optIndex}
                        className={`quiz-option ${isSelected ? 'selected' : ''} ${isCorrectOption ? 'correct' : ''} ${isWrongSelection ? 'wrong' : ''} ${submitted ? 'disabled' : ''}`}
                        onClick={() => selectAnswer(qIndex, opt)}
                      >
                        <div className="quiz-option-marker">{letter}</div>
                        <span>{opt}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {q.type === 'true_false' && (
                <div className="quiz-options">
                  {['True', 'False'].map((opt) => {
                    const isSelected = userAnswer === opt;
                    const isCorrectOption = submitted && opt === q.correct_answer;
                    const isWrongSelection = submitted && isSelected && !isCorrectOption;

                    return (
                      <div
                        key={opt}
                        className={`quiz-option ${isSelected ? 'selected' : ''} ${isCorrectOption ? 'correct' : ''} ${isWrongSelection ? 'wrong' : ''} ${submitted ? 'disabled' : ''}`}
                        onClick={() => selectAnswer(qIndex, opt)}
                      >
                        <div className="quiz-option-marker">{opt === 'True' ? 'T' : 'F'}</div>
                        <span>{opt}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {q.type === 'short_answer' && (
                <textarea
                  className="input"
                  placeholder="Type your answer..."
                  value={answers[qIndex] || ''}
                  onChange={(e) => selectAnswer(qIndex, e.target.value)}
                  disabled={submitted}
                  style={{ minHeight: 80 }}
                />
              )}

              {submitted && q.explanation && (
                <div className="quiz-explanation">
                  💡 <strong>Explanation:</strong> {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
