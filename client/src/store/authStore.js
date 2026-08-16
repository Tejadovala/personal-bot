import { create } from 'zustand';

const API_BASE = '/api';

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('pdesign_token'),
  isLoading: false,
  error: null,

  // Initialize auth state from stored token
  initialize: async () => {
    const token = get().token;
    if (!token) return;

    try {
      set({ isLoading: true });
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        set({ user: data.user, isLoading: false });
      } else {
        localStorage.removeItem('pdesign_token');
        set({ user: null, token: null, isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  // Request magic link
  requestMagicLink: async (email) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send magic link');
      set({ isLoading: false });
      return data;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  // Verify magic link token
  verifyToken: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid token');
      localStorage.setItem('pdesign_token', data.token);
      set({ user: data.user, token: data.token, isLoading: false });
      return data;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('pdesign_token');
    set({ user: null, token: null, error: null });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
