# NaviMusic

A self-hosted web music player for **Navidrome** and other [OpenSubsonic](https://opensubsonic.netlify.app/)
servers. Fast, polished, and built to feel like a native music app rather than a web page.

[![CI](https://github.com/saddemu/NaviMusic/actions/workflows/ci.yml/badge.svg)](https://github.com/saddemu/NaviMusic/actions/workflows/ci.yml)
[![Security](https://github.com/saddemu/NaviMusic/actions/workflows/security.yml/badge.svg)](https://github.com/saddemu/NaviMusic/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

React 18 + Vite + TypeScript, Zustand, TanStack Query, Howler.js, CSS Modules.
No UI framework, no Tailwind, no runtime third-party requests.

> **NaviMusic is a client, not a server.** It does not host, index, transcode, or
> distribute music. You point it at a Subsonic-compatible server you already run.

---

## How it works

NaviMusic is a **static single-page app with no backend of its own**. The Docker image
ships nothing but a static-file server. Every API call goes straight from your browser
to your music server:

```
browser ──HTTPS──> NaviMusic (static files)
   │
   └────HTTPS────> your Navidrome / OpenSubsonic server
```

Two consequences worth knowing before you deploy:

- **CORS is on your server.** If NaviMusic and Navidrome are on different origins, the
  music server (or its proxy) has to allow the NaviMusic origin. Same origin behind one
  reverse proxy is the simplest setup.
- **TLS and security headers are on your proxy.** The container has no TLS, no HSTS,
  no CSP. See [Deployment](#deployment).

---

## Quick start (Docker)

```bash
git clone https://github.com/saddemu/NaviMusic.git
cd NaviMusic
./run.sh start          # build + start detached on http://127.0.0.1:4580
```

| Command            | What it does                         |
| ------------------ | ------------------------------------ |
| `./run.sh start`   | Build and start detached             |
| `./run.sh stop`    | Stop and remove the container        |
| `./run.sh restart` | Stop, rebuild, start                 |
| `./run.sh rebuild` | Force a no-cache rebuild, then start |
| `./run.sh logs`    | Tail container logs                  |
| `./run.sh status`  | Show container status                |

The container binds to `127.0.0.1:4580` only — it is meant to sit behind a reverse
proxy, never to be exposed directly.

### Run from source

```bash
npm install
npm run dev          # http://localhost:5173 with HMR
npm run lint         # eslint
npm run typecheck    # tsc -b --noEmit
npm run build        # production build → dist/
npm run preview      # serve the production build on :3000
```

Requires **Node 22+**. There is no test suite.

The dev server binds to localhost. For LAN testing, run `npx vite --host` explicitly
rather than changing the config.

---

## Deployment

Serve `dist/` from any static host, or run the container behind your existing proxy.
The reverse proxy owns TLS, HSTS, compression, rate limiting, and the CSP. A minimal
hardened Nginx server block:

```nginx
server {
    listen 443 ssl http2;
    server_name music.example.com;

    ssl_certificate     /etc/letsencrypt/live/music.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/music.example.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header X-Content-Type-Options    "nosniff" always;
    add_header Referrer-Policy           "strict-origin-when-cross-origin" always;
    add_header X-Frame-Options           "DENY" always;

    # script-src 'self' is the load-bearing directive: it is what keeps a
    # hypothetical sanitizer bypass from turning into script execution.
    # connect-src / img-src / media-src must reach your music server's origin;
    # narrow the https: wildcards to that exact host if it is a fixed one.
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https:; media-src 'self' blob: https:; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests" always;

    location / {
        proxy_pass         http://127.0.0.1:4580;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

---

## Logging in

| Field       | Example                                               |
| ----------- | ----------------------------------------------------- |
| Server URL  | `https://music.example.com`                           |
| Username    | your Navidrome username                               |
| Password    | your Navidrome password                               |
| Remember me | `localStorage` when ticked, `sessionStorage` when not |

The password is used **once**, in memory, to derive a Subsonic token
(`md5(password + salt)` with a freshly generated salt) and is then discarded. Only
`{ serverUrl, username, token, salt }` is persisted. If the server ever rejects the
token, NaviMusic logs out and returns to the login screen.

The login form warns when you enter a plain-`http://` URL for a non-loopback host.

---

## Features

- **Home** — recently played, newest, and random rows; drag horizontally with the
  mouse (touch scrolls natively), with momentum and rubber-banding at the ends
- **Library** — Albums (sortable, genre filter, lazy-loaded), Artists (alphabetical
  jump bar), Songs (virtualized, sortable, play/shuffle the current view), Genres
- **Search** — 300 ms debounce across songs, albums, and artists, with recent searches
- **Detail pages** — Album, Artist (sanitized bio, similar artists, top songs),
  Playlist (drag-reorder, remove, delete)
- **Starred** — songs / albums / artists tabs
- **Playlists** — create, delete, reorder, remove tracks
- **Player** — custom progress and volume sliders, shuffle, repeat (off / all / one),
  star the current track, gapless prefetch of the next queue item
- **Queue drawer** — drag to reorder, remove, clear; drag down to dismiss
- **Now Playing** — fullscreen view that grows out of the artwork that opened it,
  blurred cover backdrop, synced lyrics when the server returns them
- **Settings** — max bitrate, crossfade, prefetch toggle, server ping, cache clear;
  the profile menu in the top bar reports the server round trip on demand
- **Phone layout** — under 768 px the sidebar gives way to a bottom tab bar
  (Home / Search / Library / Settings), the player collapses to artwork, title
  and transport, tables drop their secondary columns, and everything clears the
  home indicator
- **Installable** — web manifest, maskable icons, and a service worker that
  caches only the app shell, so a cold launch needs no network; it never touches
  the Navidrome server's API, artwork, or streams
- **OS integration** — Media Session API metadata, position state, and actions:
  lock screen, notification, hardware media keys. Playback runs through a media
  element and Howler's auto-suspend is off, so an installed app keeps playing
  with the screen off
- **Motion and materials** — interruptible, velocity-aware springs (no animation
  library) and a three-weight translucent material system
- **Accessibility** — honours `prefers-reduced-motion`, `prefers-reduced-transparency`,
  and `prefers-contrast`; focus traps and restoration in dialogs; a `rem`-based type
  scale so the reader's text-size preference applies

### Keyboard shortcuts

| Key                       | Action                |
| ------------------------- | --------------------- |
| `Space`                   | Play / pause          |
| `←` / `→`                 | Seek ±10 s            |
| `Shift + ←` / `Shift + →` | Previous / next track |
| `m`                       | Mute toggle           |
| `f`                       | Toggle fullscreen     |
| `Esc`                     | Close fullscreen      |

---

## Project layout

```
src/
  components/
    layout/     AppLayout, TopBar, MobileTabBar, Backdrop
    sidebar/    Sidebar
    player/     PlayerBar, QueueDrawer, NowPlaying, LyricsDrawer
    pages/      Login, Home, Library, Albums, Artists, Songs, Genres,
                Search, Playlists, PlaylistDetail, AlbumDetail,
                ArtistDetail, Starred, Settings
    ui/         AlbumCard, ArtistCard, TrackRow, Modal, Toast, Skeleton,
                ContextMenu, EmptyState, PageHeader, Tooltip, Icon
  lib/          subsonic (the single API chokepoint), player (Howler
                singleton), crypto (MD5 for token derivation), sanitize
                (DOMPurify config), pwa (service worker registration),
                spring, utils
  store/        authStore, playerStore, settingsStore, uiStore, toastStore
  hooks/        useGlobalShortcuts, useStarMutation, useSubsonicConfig,
                useDragScroll, useSheetGesture, useLyrics, useMediaQuery
  types/        subsonic
  styles/       global.css (design tokens + breakpoints)
public/         manifest.webmanifest, sw.js, icons

Dockerfile · docker-compose.yml · run.sh
.github/        CI, scheduled security scans, Dependabot
```

Every server call goes through `request()` in `src/lib/subsonic.ts`. Adding an
endpoint means adding a function there, not a `fetch()` elsewhere.

---

## Security

Full detail in [SECURITY.md](SECURITY.md). The short version:

- Passwords are never stored, never logged, and never placed in a URL.
- All JSON API calls are **POST** with a form body, so the auth token stays out of
  URLs and server access logs. `stream` and `getCoverArt` are the only token-bearing
  URLs, because the browser fetches them as media.
- Server URLs are validated with the `URL` constructor: non-`http(s)` schemes are
  rejected, and embedded credentials, query, and fragment are stripped.
- Server-supplied HTML (artist bios) passes through **DOMPurify** with a tag _and_
  attribute whitelist; bio links are forced to `rel="noopener noreferrer"`. Lyrics
  render as plain text. ESLint blocks `dangerouslySetInnerHTML` at error level.
- **No third-party requests at runtime** — fonts are self-hosted, and there are no
  CDNs, analytics, or telemetry. The app talks only to the server you configure.
- Dependency versions are pinned exactly. `npm audit` is at zero for runtime
  dependencies, enforced on every push and weekly by the
  [Security workflow](.github/workflows/security.yml), alongside CodeQL and a
  full-history secret scan. Dependabot opens upgrade pull requests weekly.
- The container runs as a non-root user with a read-only filesystem and
  `no-new-privileges`, bound to `127.0.0.1`.

Found a vulnerability? See [SECURITY.md](SECURITY.md#reporting-a-vulnerability).

---

## Contributing

Issues and pull requests are welcome. Before opening a PR:

```bash
npm run lint && npm run typecheck && npm run build
```

House rules that CI and ESLint enforce: no `any`, no `dangerouslySetInnerHTML`
without DOMPurify, no ad-hoc `fetch()` to the music server, no third-party runtime
requests, and exact dependency versions (no `^` or `~`).

`main` takes changes only through a pull request, and five checks have to pass
before a merge: lint/typecheck/build, the Docker image build, `npm audit`, a
full-history secret scan, and CodeQL. Commits on `main` carry a verified
signature — `git config gpg.format ssh` with an SSH signing key registered on
your account is enough, no GPG needed.

---

## License

[MIT](LICENSE).
