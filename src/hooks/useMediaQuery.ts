import { useCallback, useSyncExternalStore } from 'react';
import { MOBILE_BREAKPOINT } from '@/lib/constants';

const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT}px)`;

/**
 * Subscribes to a media query. `useSyncExternalStore` rather than an effect:
 * the first render already reads the real value, so nothing flashes the
 * desktop layout on a phone before an effect corrects it.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}
