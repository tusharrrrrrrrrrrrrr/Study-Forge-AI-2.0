import { useState } from 'react';
import { api } from '../utils/api';

export default function AuthPage({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        await api.login(email, password);
        onLoginSuccess();
      } else {
        await api.register(email, password);
        setMessage('Registration successful! You can now log in.');
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.forgotPassword(email);
      setMessage(res.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="welcome-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--surface-color)' }}>
      <div className="glass-panel" style={{ padding: '40px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '8px', background: 'linear-gradient(45deg, var(--primary-color), var(--accent-color))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>StudyForge AI</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
          {isLogin ? 'Sign in to continue' : 'Create an account'}
        </p>

        {error && <div className="toast toast-error" style={{ position: 'relative', margin: '0 0 16px', transform: 'none', animation: 'none', left: 0 }}>{error}</div>}
        {message && <div className="toast toast-success" style={{ position: 'relative', margin: '0 0 16px', transform: 'none', animation: 'none', left: 0 }}>{message}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="chat-input"
            style={{ width: '100%', padding: '12px' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="chat-input"
            style={{ width: '100%', padding: '12px' }}
          />
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <p style={{ marginTop: '24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '14px', marginLeft: '8px' }}
            onClick={() => { setIsLogin(!isLogin); setError(null); setMessage(null); }}
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>

        {isLogin && (
          <p style={{ marginTop: '16px', fontSize: '14px' }}>
            <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '14px' }} onClick={handleForgotPassword} disabled={loading}>
              Forgot Password?
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
