# Security & Transparency

pMusic is a static single-page app. There is **no backend**: the Docker image ships a
plain static-file server and nothing else. Everything described below happens in your
browser.

## What the app does with your data

| Data | Where it goes | Where it's stored |
| --- | --- | --- |
| Password | Used once, in memory, to derive `md5(password + salt)`; then discarded | **Never stored, never logged, never sent in a URL** |
| Auth token + salt | Sent to *your* music server with each API call (POST body) | `localStorage` (with "Remember me") or `sessionStorage`, key `pmusic.auth.v1` |
| Server URL | Requests go only to this origin | `pmusic.lastServerUrl` in `localStorage` (kept after logout to prefill the login form) |
| Settings, volume, UI state, recent searches | Nowhere — local only | `localStorage` |

The app communicates **exclusively** with the Subsonic/Navidrome server you type in at
login. There are no analytics, no telemetry, no CDNs, no external fonts, no third-party
requests of any kind. You can verify this from the network tab — or from the CSP in
`nginx.example.conf`, which would block them.

## Hardening in place

- All JSON API calls go through a single audited helper (`src/lib/subsonic.ts`) using
  POST form bodies, keeping credentials out of URLs and access logs. `stream` /
  `getCoverArt` are the only token-bearing URLs (browser media fetches require it).
- Server-supplied HTML (artist bios) is sanitized with DOMPurify using a strict tag and
  attribute whitelist; links are forced to `rel="noopener noreferrer"`. Lyrics render as
  plain text.
- Server URLs are validated (`http(s)` only; embedded credentials, query and hash are
  stripped).
- An invalid/expired token (Subsonic error 40/41) triggers an immediate logout.
- Dependencies are version-pinned and kept at `npm audit` zero.
- Container: non-root user, read-only filesystem, `no-new-privileges`, bound to
  `127.0.0.1`. TLS, HSTS, CSP and rate limiting belong to the reverse proxy
  (`nginx.example.conf`).

## Known trade-offs

- The auth token lives in browser storage, readable by JavaScript. This is inherent to a
  backend-less SPA; the CSP (`script-src 'self'`) is the compensating control. Use
  session-only login on shared machines (untick "Remember me").
- Subsonic token auth is MD5-based by protocol design. Use HTTPS (the login form warns
  on plain HTTP) and a strong password.

## Reporting a vulnerability

Please open a GitHub issue (or contact the maintainer privately for sensitive reports)
with steps to reproduce. Reports are welcome — this project aims to stay transparent
about its security posture.
