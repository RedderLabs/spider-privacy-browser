import { create } from 'zustand';
import { uuidv4 } from '../utils/uuid';

interface Tab {
  id: string;
  url: string;
  title: string;
  canGoBack: boolean;
  canGoForward: boolean;
  trackersBlocked: number;
  // Per-domain breakdown of blocked trackers for the current page, so the user
  // can see exactly what junk was stopped. Reset is implicit: a fresh tab
  // starts empty; counts accumulate for the tab's session.
  blockedDomains: Record<string, number>;
  // In-memory thumbnail (data-uri) captured when leaving the tab, shown in the
  // Tabs grid. Like the whole store, it lives only for this session.
  preview?: string;
}

interface TabStore {
  tabs: Tab[];
  activeTabId: string | null;
  addTab: (url?: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<Tab>) => void;
  // Record a single blocked tracker for a tab (optionally the matched domain).
  recordBlocked: (id: string, domain?: string) => void;
  clearAll: () => void; // limpia todo al salir
}

// Tabs are IN-MEMORY ONLY (incognito-pure model): nothing about a browsing
// session survives an app close/kill — only the language preference persists
// (see settingsStore). On next launch the app opens with zero tabs.
export const useTabStore = create<TabStore>((set) => ({
  tabs: [],
  activeTabId: null,
  addTab: (url = 'about:blank') => {
    const id = uuidv4();
    set((s) => ({
      tabs: [...s.tabs, { id, url, title: 'Nueva pestaña', canGoBack: false, canGoForward: false, trackersBlocked: 0, blockedDomains: {} }],
      activeTabId: id,
    }));
  },
  closeTab: (id) => set((s) => {
    const remaining = s.tabs.filter((t) => t.id !== id);
    return {
      tabs: remaining,
      activeTabId: remaining.length > 0 ? remaining[remaining.length - 1].id : null,
    };
  }),
  setActiveTab: (id) => set({ activeTabId: id }),
  updateTab: (id, updates) => set((s) => ({
    tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...updates } : t)),
  })),
  recordBlocked: (id, domain) => set((s) => ({
    tabs: s.tabs.map((t) => {
      if (t.id !== id) { return t; }
      const key = domain || 'otros';
      return {
        ...t,
        trackersBlocked: t.trackersBlocked + 1,
        blockedDomains: { ...t.blockedDomains, [key]: (t.blockedDomains[key] || 0) + 1 },
      };
    }),
  })),
  clearAll: () => set({ tabs: [], activeTabId: null }),
}));
