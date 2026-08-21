/**
 * API Client — Handles all communication with the FastAPI backend.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

function getTokens() {
  return {
    access: localStorage.getItem('access_token'),
    refresh: localStorage.getItem('refresh_token')
  };
}

function setTokens(access, refresh) {
  if (access) localStorage.setItem('access_token', access);
  if (refresh) localStorage.setItem('refresh_token', refresh);
}

export function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

export function isAuthenticated() {
  return !!localStorage.getItem('access_token');
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  let tokens = getTokens();

  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  if (tokens.access) {
    config.headers['Authorization'] = `Bearer ${tokens.access}`;
  }

  // Don't set Content-Type for FormData (file uploads)
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  let response = await fetch(url, config);

  if (response.status === 401 && tokens.refresh && endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
    try {
      const refreshResp = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: tokens.refresh })
      });
      if (refreshResp.ok) {
        const newTokens = await refreshResp.json();
        setTokens(newTokens.access_token, newTokens.refresh_token);
        config.headers['Authorization'] = `Bearer ${newTokens.access_token}`;
        response = await fetch(url, config); // retry original request
      } else {
        clearTokens();
        window.location.reload(); // force re-login
      }
    } catch (e) {
      clearTokens();
      window.location.reload();
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  login: async (email, password) => {
    const form = new URLSearchParams();
    form.append('username', email); // OAuth2 expects username
    form.append('password', password);
    const resp = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(err.detail || 'Login failed');
    }
    const data = await resp.json();
    setTokens(data.access_token, data.refresh_token);
    return data;
  },
  register: (email, password) => request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  logout: () => {
    clearTokens();
    window.location.reload();
  },

  // Workspaces
  createWorkspace: (name) => request('/workspaces', { method: 'POST', body: JSON.stringify({ name }) }),
  getWorkspaces: () => request('/workspaces'),
  deleteWorkspace: (workspaceId) => request(`/workspaces/${workspaceId}`, { method: 'DELETE' }),

  // Upload
  uploadPDF: (workspaceId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/workspaces/${workspaceId}/upload`, { method: 'POST', body: formData });
  },

  // Documents
  deleteDocument: (docId) => request(`/documents/${docId}`, { method: 'DELETE' }),

  // Chat
  chat: (workspaceId, message, useWebSearch = false) =>
    request('/chat', { method: 'POST', body: JSON.stringify({ workspace_id: workspaceId, message, use_web_search: useWebSearch }) }),
  getChatHistory: (workspaceId) => request(`/chat/history/${workspaceId}`),
  clearChatHistory: (workspaceId) => request(`/chat/history/${workspaceId}`, { method: 'DELETE' }),

  // Summary
  getSummary: (workspaceId, mode = 'full') =>
    request('/summary', { method: 'POST', body: JSON.stringify({ workspace_id: workspaceId, mode }) }),

  // Flashcards
  getFlashcards: (workspaceId, count = 10, difficulty = 'mixed') =>
    request('/flashcards', {
      method: 'POST',
      body: JSON.stringify({ workspace_id: workspaceId, count, difficulty }),
    }),
  updateFlashcardProgress: (workspaceId, cardIndex, mastery) =>
    request('/flashcards/progress', {
      method: 'POST',
      body: JSON.stringify({ workspace_id: workspaceId, card_index: cardIndex, mastery }),
    }),

  // Quiz
  getQuiz: (workspaceId, count = 10, difficulty = 'mixed') =>
    request('/quiz', {
      method: 'POST',
      body: JSON.stringify({ workspace_id: workspaceId, count, difficulty }),
    }),
  submitQuiz: (workspaceId, answers, totalQuestions) =>
    request('/quiz/submit', {
      method: 'POST',
      body: JSON.stringify({ workspace_id: workspaceId, answers, total_questions: totalQuestions }),
    }),

  // Concepts
  getConcepts: (workspaceId) =>
    request('/concepts', { method: 'POST', body: JSON.stringify({ workspace_id: workspaceId }) }),

  // Visuals
  getVisuals: (workspaceId, topic = null) =>
    request('/visuals', { method: 'POST', body: JSON.stringify({ workspace_id: workspaceId, topic }) }),

  // Mock Exam
  getMockExam: (workspaceId, durationMinutes = 30) =>
    request('/mock_exam', { method: 'POST', body: JSON.stringify({ workspace_id: workspaceId, duration_minutes: durationMinutes }) }),
  submitMockExam: (workspaceId, answers) =>
    request('/mock_exam/submit', { method: 'POST', body: JSON.stringify({ workspace_id: workspaceId, answers }) }),

  // Progress
  getProgress: (workspaceId) => request(`/progress/${workspaceId}`),
  getOverallProgress: () => request('/progress'),
};
