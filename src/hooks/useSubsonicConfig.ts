import { useAuthStore } from '@/store/authStore';
import type { SubsonicConfig } from '@/types/subsonic';

export function useSubsonicConfig(): SubsonicConfig {
  const config = useAuthStore((s) => s.config);
  if (!config) throw new Error('Subsonic config not available — user not authenticated');
  return config;
}
