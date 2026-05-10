import { create } from 'zustand';

const STORAGE_KEY = 'pmusic.ui.v1';

const SIDEBAR_MIN = 64;
const SIDEBAR_MAX = 360;
const SIDEBAR_DEFAULT = 236;
const COLLAPSED_THRESHOLD = 140;

interface PersistedUi {
  sidebarWidth: number;
  lastExpandedWidth: number;
}

function load(): PersistedUi {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sidebarWidth: SIDEBAR_DEFAULT, lastExpandedWidth: SIDEBAR_DEFAULT };
    const parsed = JSON.parse(raw) as Partial<PersistedUi>;
    return {
      sidebarWidth: clamp(parsed.sidebarWidth ?? SIDEBAR_DEFAULT, SIDEBAR_MIN, SIDEBAR_MAX),
      lastExpandedWidth: clamp(
        parsed.lastExpandedWidth ?? SIDEBAR_DEFAULT,
        COLLAPSED_THRESHOLD,
        SIDEBAR_MAX,
      ),
    };
  } catch {
    return { sidebarWidth: SIDEBAR_DEFAULT, lastExpandedWidth: SIDEBAR_DEFAULT };
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

interface UiStore {
  sidebarWidth: number;
  lastExpandedWidth: number;
  backdropImageUrl: string | undefined;
  setSidebarWidth: (px: number) => void;
  toggleSidebar: () => void;
  setBackdropImageUrl: (url: string | undefined) => void;
}

export const SIDEBAR_BOUNDS = { min: SIDEBAR_MIN, max: SIDEBAR_MAX, threshold: COLLAPSED_THRESHOLD };

export const useUiStore = create<UiStore>((set, get) => {
  const initial = load();
  return {
    sidebarWidth: initial.sidebarWidth,
    lastExpandedWidth: initial.lastExpandedWidth,
    backdropImageUrl: undefined,
    setBackdropImageUrl: (url) => set({ backdropImageUrl: url }),
    setSidebarWidth: (px) => {
      const w = clamp(px, SIDEBAR_MIN, SIDEBAR_MAX);
      const collapsed = w < COLLAPSED_THRESHOLD;
      const next: Partial<UiStore> = { sidebarWidth: w };
      if (!collapsed) next.lastExpandedWidth = w;
      set(next);
      const persisted = {
        sidebarWidth: w,
        lastExpandedWidth: collapsed ? get().lastExpandedWidth : w,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    },
    toggleSidebar: () => {
      const { sidebarWidth, lastExpandedWidth } = get();
      const collapsed = sidebarWidth < COLLAPSED_THRESHOLD;
      const target = collapsed ? lastExpandedWidth : SIDEBAR_MIN;
      get().setSidebarWidth(target);
    },
  };
});
