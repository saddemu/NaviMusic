import { create } from 'zustand';

// Pre-rename key name, kept so saved settings survive the move to NaviMusic.
const STORAGE_KEY = 'pmusic.settings.v1';

export type MaxBitrate = 128 | 192 | 256 | 320 | 0;

export interface SettingsState {
  maxBitrate: MaxBitrate;
  crossfadeSeconds: number;
  prefetchNext: boolean;
  showAlbumGain: boolean;
}

const defaults: SettingsState = {
  maxBitrate: 0,
  crossfadeSeconds: 0,
  prefetchNext: true,
  showAlbumGain: false,
};

function load(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<SettingsState>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

function save(state: SettingsState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

interface SettingsStore extends SettingsState {
  set: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...load(),
  set: (key, value) => {
    set({ [key]: value } as Partial<SettingsState>);
    save({ ...get(), [key]: value });
  },
  reset: () => {
    save(defaults);
    set(defaults);
  },
}));
