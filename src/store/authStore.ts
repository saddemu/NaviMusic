import { create } from 'zustand';
import type { SubsonicConfig, SubsonicUser } from '@/types/subsonic';
import { deriveToken, generateSalt } from '@/lib/crypto';
import { getUser, normalizeServerUrl, ping } from '@/lib/subsonic';

const STORAGE_KEY = 'pmusic.auth.v1';

interface PersistedAuth {
  config: SubsonicConfig;
  user: SubsonicUser;
  remember: boolean;
}

function readPersisted(): PersistedAuth | null {
  try {
    const fromLocal = localStorage.getItem(STORAGE_KEY);
    if (fromLocal) return JSON.parse(fromLocal) as PersistedAuth;
    const fromSession = sessionStorage.getItem(STORAGE_KEY);
    if (fromSession) return JSON.parse(fromSession) as PersistedAuth;
  } catch {
    /* ignore */
  }
  return null;
}

function writePersisted(data: PersistedAuth): void {
  const target = data.remember ? localStorage : sessionStorage;
  const other = data.remember ? sessionStorage : localStorage;
  other.removeItem(STORAGE_KEY);
  target.setItem(STORAGE_KEY, JSON.stringify(data));
}

function clearPersisted(): void {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
}

interface AuthStore {
  config: SubsonicConfig | null;
  user: SubsonicUser | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  hydrate: () => void;
  login: (
    serverUrl: string,
    username: string,
    password: string,
    remember: boolean,
  ) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  config: null,
  user: null,
  isAuthenticated: false,
  isHydrated: false,
  hydrate: () => {
    const persisted = readPersisted();
    if (persisted) {
      set({
        config: persisted.config,
        user: persisted.user,
        isAuthenticated: true,
        isHydrated: true,
      });
    } else {
      set({ isHydrated: true });
    }
  },
  login: async (serverUrl, username, password, remember) => {
    const cleanUrl = normalizeServerUrl(serverUrl);
    const salt = generateSalt();
    const token = deriveToken(password, salt);
    const config: SubsonicConfig = { serverUrl: cleanUrl, username, token, salt };
    await ping(config);
    let user: SubsonicUser;
    try {
      user = await getUser(config, username);
    } catch {
      user = { username };
    }
    writePersisted({ config, user, remember });
    set({ config, user, isAuthenticated: true });
  },
  logout: () => {
    clearPersisted();
    set({ config: null, user: null, isAuthenticated: false });
  },
}));
