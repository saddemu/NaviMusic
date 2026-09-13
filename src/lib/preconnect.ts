import { readLastServerUrl } from '@/store/authStore';

/**
 * Opens the connection to the Navidrome server before anything asks for it.
 *
 * Every API call, every piece of cover art and every stream is cross-origin,
 * so the first one of them pays DNS + TCP + TLS in series before a byte of
 * response arrives. The server URL cannot be baked into `index.html` — the
 * user picks it — but the last one used is in `localStorage`, so the hint can
 * go out synchronously at boot, well before React renders and the first query
 * fires.
 */
export function preconnectToServer(): void {
  let origin: string;
  try {
    const url = readLastServerUrl();
    if (!url) return;
    origin = new URL(url).origin;
  } catch {
    return;
  }

  for (const rel of ['preconnect', 'dns-prefetch']) {
    const link = document.createElement('link');
    link.rel = rel;
    link.href = origin;
    // Credentialed: the streams and artwork are fetched with cookies on
    // servers that use them, and an anonymous connection would not be reused.
    if (rel === 'preconnect') link.crossOrigin = 'use-credentials';
    document.head.appendChild(link);
  }
}
