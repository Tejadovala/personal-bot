import { create } from 'zustand';

const API_BASE = '/api';

const usePrototypeStore = create((set, get) => ({
  // List of user's prototypes
  prototypes: [],
  isLoadingList: false,

  // Active prototype in editor
  activePrototype: null,
  activeFlow: null,
  activeScreenId: null,
  navigationHistory: [],
  isGenerating: false,
  isEditing: false,
  error: null,

  // Fetch user's prototypes
  fetchPrototypes: async () => {
    const token = localStorage.getItem('pdesign_token');
    if (!token) return;

    set({ isLoadingList: true });
    try {
      const res = await fetch(`${API_BASE}/prototypes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Parse flow_json strings for each prototype (needed for screen count in dashboard cards)
        const prototypes = (data.prototypes || []).map((p) => ({
          ...p,
          flow_json: typeof p.flow_json === 'string' ? (() => {
            try { return JSON.parse(p.flow_json); } catch { return null; }
          })() : p.flow_json,
        }));
        set({ prototypes, isLoadingList: false });
      } else {
        set({ isLoadingList: false });
      }
    } catch {
      set({ isLoadingList: false });
    }
  },

  // Create new prototype from prompt
  createPrototype: async (prompt) => {
    const token = localStorage.getItem('pdesign_token');
    set({ isGenerating: true, error: null });

    try {
      const res = await fetch(`${API_BASE}/prototypes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate prototype');

      const flow = typeof data.prototype.flow_json === 'string'
        ? JSON.parse(data.prototype.flow_json)
        : data.prototype.flow_json;

      set({
        activePrototype: data.prototype,
        activeFlow: flow,
        activeScreenId: flow.start_screen || flow.screens?.[0]?.screen_id,
        navigationHistory: [flow.start_screen || flow.screens?.[0]?.screen_id],
        isGenerating: false,
      });

      return data.prototype;
    } catch (err) {
      set({ error: err.message, isGenerating: false });
      throw err;
    }
  },

  // Load an existing prototype
  loadPrototype: async (id) => {
    const token = localStorage.getItem('pdesign_token');
    set({ isGenerating: true, error: null });

    try {
      const res = await fetch(`${API_BASE}/prototypes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load prototype');

      const flow = typeof data.prototype.flow_json === 'string'
        ? JSON.parse(data.prototype.flow_json)
        : data.prototype.flow_json;

      set({
        activePrototype: data.prototype,
        activeFlow: flow,
        activeScreenId: flow.start_screen || flow.screens?.[0]?.screen_id,
        navigationHistory: [flow.start_screen || flow.screens?.[0]?.screen_id],
        isGenerating: false,
      });

      return data.prototype;
    } catch (err) {
      set({ error: err.message, isGenerating: false });
      throw err;
    }
  },

  // Load shared prototype (no auth required)
  loadSharedPrototype: async (shareId) => {
    set({ isGenerating: true, error: null });

    try {
      const res = await fetch(`${API_BASE}/share/${shareId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Prototype not found');

      const flow = typeof data.prototype.flow_json === 'string'
        ? JSON.parse(data.prototype.flow_json)
        : data.prototype.flow_json;

      set({
        activePrototype: data.prototype,
        activeFlow: flow,
        activeScreenId: flow.start_screen,
        navigationHistory: [flow.start_screen],
        isGenerating: false,
      });

      return data.prototype;
    } catch (err) {
      set({ error: err.message, isGenerating: false });
      throw err;
    }
  },

  // Edit a single screen with follow-up prompt
  editScreen: async (screenId, editPrompt) => {
    const { activePrototype } = get();
    if (!activePrototype) return;

    const token = localStorage.getItem('pdesign_token');
    set({ isEditing: true, error: null });

    try {
      const res = await fetch(`${API_BASE}/prototypes/${activePrototype.id}/edit-screen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ screenId, editPrompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to edit screen');

      // Server returns { screen, flow } directly
      const flow = data.flow;

      set({
        activePrototype: { ...activePrototype, flow_json: flow },
        activeFlow: flow,
        isEditing: false,
      });

      return data;
    } catch (err) {
      set({ error: err.message, isEditing: false });
      throw err;
    }
  },

  // Toggle sharing
  toggleShare: async () => {
    const { activePrototype } = get();
    if (!activePrototype) return;

    const token = localStorage.getItem('pdesign_token');
    try {
      const res = await fetch(`${API_BASE}/prototypes/${activePrototype.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled: !activePrototype.share_enabled }),
      });
      const data = await res.json();
      if (res.ok) {
        set({
          activePrototype: {
            ...activePrototype,
            share_id: data.share_id,
            share_enabled: data.share_enabled ? 1 : 0,
          },
        });
      }
      return data;
    } catch (err) {
      console.error('Failed to toggle share:', err);
    }
  },

  // Delete prototype
  deletePrototype: async (id) => {
    const token = localStorage.getItem('pdesign_token');
    try {
      const res = await fetch(`${API_BASE}/prototypes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete prototype');
      }
      set((state) => ({
        prototypes: state.prototypes.filter((p) => p.id !== id),
      }));
    } catch (err) {
      console.error('Failed to delete:', err);
      alert(err.message);
    }
  },

  // Navigate to a screen (within the prototype preview)
  navigateToScreen: (screenId) => {
    set((state) => ({
      activeScreenId: screenId,
      navigationHistory: [...state.navigationHistory, screenId],
    }));
  },

  // Go back in navigation history
  goBack: () => {
    set((state) => {
      const history = [...state.navigationHistory];
      history.pop();
      const previousScreen = history[history.length - 1];
      return {
        activeScreenId: previousScreen || state.activeFlow?.start_screen,
        navigationHistory: history.length > 0 ? history : [state.activeFlow?.start_screen],
      };
    });
  },

  // Reset active prototype
  resetActive: () => {
    set({
      activePrototype: null,
      activeFlow: null,
      activeScreenId: null,
      navigationHistory: [],
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));

export default usePrototypeStore;
