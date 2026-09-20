# Security Policy

NaviMusic is a static single-page app. There is **no backend of our own**: the Docker image
ships a plain static-file server and nothing else. Everything described below happens in
your browser, against the music server you configure.

## Supported versions

NaviMusic is developed on `main` and has no release branches. Only the current `main` and
the latest tag receive fixes. If you are running an older build, update before reporting.

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Use GitHub's private reporting instead:
[**Report a vulnerability**](https://github.com/saddemu/NaviMusic/security/advisories/new)
(Security → Advisories → Report a vulnerability). That channel is private until a fix
ships.

Please include:

- affected version or commit
- steps to reproduce, or a proof of concept
- what an attacker gains

Expect an acknowledgement within a few days. Since this is a hobby project maintained by
one person, please allow reasonable time for a fix before public disclosure. Credit in
the advisory is offered by default; say so if you would rather stay anonymous.

Out of scope: vulnerabilities in Navidrome or other Subsonic servers (report those
upstream), missing security headers on a deployment whose reverse proxy is not configured
as documented, and findings that require an already-compromised browser or device.

## What the app does with your data

| Data                                        | Where it goes                                                          | Where it's stored                                                                      |
| ------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Password                                    | Used once, in memory, to derive `md5(password + salt)`, then discarded | **Never stored, never logged, never sent in a URL**                                    |
| Auth token + salt                           | Sent to _your_ music server with each API call (POST body)             | `localStorage` (with "Remember me") or `sessionStorage`, key `pmusic.auth.v1`          |
| Server URL                                  | Requests go only to this origin                                        | `pmusic.lastServerUrl` in `localStorage` (kept after logout to prefill the login form) |
| Settings, volume, UI state, recent searches | Nowhere — local only                                                   | `localStorage`                                                                         |

The app communicates **exclusively** with the Subsonic/OpenSubsonic server you type in at
login. There are no analytics, no telemetry, no CDNs, no external fonts, and no
third-party requests of any kind. You can verify this in your browser's network tab.

## Hardening in place

- All JSON API calls go through a single audited helper (`src/lib/subsonic.ts`) using
  POST form bodies, keeping credentials out of URLs and access logs. `stream` and
  `getCoverArt` are the only token-bearing URLs, because the browser fetches them as
  media.
- Server-supplied HTML (artist bios) is sanitized with DOMPurify using a strict tag and
  attribute whitelist; links are forced to `rel="noopener noreferrer"`. Lyrics render as
  plain text. `react/no-danger` is an ESLint error, so a new unsanitized sink fails lint.
- Server URLs are validated with the `URL` constructor: `http(s)` only, with embedded
  credentials, query, and fragment stripped. The login form warns on plain HTTP to a
  non-loopback host.
- An invalid or expired token (Subsonic error 40/41) triggers an immediate logout.
- `@typescript-eslint/no-explicit-any` is an error, and production builds strip
  `console` and `debugger` statements.
- Dependency versions are pinned exactly (no `^` or `~`). CI fails on **any** advisory
  in runtime dependencies and on high or critical advisories in build tooling, on every
  push and again weekly on a schedule. CodeQL (`security-extended`) and a full-history
  secret scan run on the same cadence. Dependabot opens upgrade pull requests weekly.
- `main` is protected by a repository ruleset: no force pushes, no deletion,
  changes arrive through a pull request, and five checks must pass before a
  merge (lint/typecheck/build, Docker build, npm audit, secret scan, CodeQL).
  Release tags are immutable. Commits on `main` are signed and the ruleset
  requires a verified signature.
- CI itself is treated as attack surface: every action is pinned to a commit
  SHA (the repository rejects unpinned ones), only GitHub-owned actions are
  allowed, the workflow token is read-only, checkouts do not persist
  credentials, and the container base image is pinned by digest. Workflows on
  pull requests from forks need explicit approval.
- Container: non-root user, read-only filesystem, `no-new-privileges`, bound to
  `127.0.0.1`. TLS, HSTS, CSP, and rate limiting belong to the reverse proxy — see the
  example server block in the [README](README.md#deployment).

## Known trade-offs

- **The auth token lives in browser storage, readable by JavaScript.** This is inherent
  to a backend-less SPA. The CSP (`script-src 'self'`) is the compensating control: with
  no inline or third-party script allowed, there is no practical path to reading it.
  Untick "Remember me" on shared machines so the token dies with the tab.
- **Subsonic token auth is MD5-based by protocol design.** The token is
  `md5(password + salt)` with a per-login salt, which is what the server expects; it is
  not a password hash and is not meant to be one. Use HTTPS and a strong password.
  The MD5 in `src/lib/crypto.ts` exists solely for this handshake and is used for
  nothing else.
- **`stream` and `getCoverArt` carry the token in the query string,** because
  `<audio src>` and `<img src>` are fetched by the browser and cannot carry a POST body.
  These URLs reach your own music server's access log. A `Referrer-Policy` of
  `strict-origin-when-cross-origin` keeps them out of cross-origin referrers.
- **CORS must be relaxed on your music server** when it is on a different origin from
  NaviMusic. Allow the NaviMusic origin specifically, not `*`.
