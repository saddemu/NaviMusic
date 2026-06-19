# pMusic

A self-hosted web music player for **Navidrome** (OpenSubsonic API). Polished, fast, secure
— built to feel like Apple Music.

Built with **React 18 + Vite + TypeScript**, **Zustand**, **TanStack Query**, **Howler.js**,
**CSS Modules**. No UI library, no Tailwind.

---

## Quick start (Docker — recommended)

```bash
./run.sh start          # build + start in the background on http://127.0.0.1:4580
./run.sh logs           # tail logs
./run.sh stop           # stop and remove
./run.sh restart        # stop, rebuild, restart
./run.sh status         # show container status
./run.sh rebuild        # force a no-cache rebuild
```

The container listens on `127.0.0.1:4580`. Plug it into your existing Nginx (or any
reverse proxy) on the host:

```nginx
location / {
    proxy_pass http://127.0.0.1:4580;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Real-IP $remote_addr;
}
```

> **CORS**: pMusic talks to your Navidrome server directly from the browser. If they live
> on different origins, allow the pMusic origin in Navidrome's CORS config (or in your proxy).

---

## Run locally for development

```bash
npm install
npm run dev          # http://localhost:5173 (HMR)
npm run typecheck    # tsc --noEmit
npm run build        # production build → dist/
npm run preview      # preview the production build on :3000
```

Requirements: **Node 22+** (Node 20 is end-of-life).

---

## Logging in

Open the app and enter:

| Field        | Example                          |
| ------------ | -------------------------------- |
| Server URL   | `https://music.example.com`      |
| Username     | `demu`                           |
| Password     | `••••••••`                       |
| Remember me  | persists in `localStorage` (else `sessionStorage`) |

The password is **used once** to derive a Subsonic token (`md5(password + salt)`) and
then discarded. Only `{ serverUrl, username, token, salt }` are stored.

If a token ever fails server-side, pMusic auto-logs out and returns to the login screen.

---

## Features

- **Home** — recently played, newest, random; card rows scroll horizontally by
  dragging with the mouse (touch scrolls natively)
- **Library** — Albums (sortable + genre filter, lazy-loaded), Artists (alphabetical jump
  bar), Songs (virtualized list, sortable), Genres
- **Search** — instant 300 ms debounce across songs / albums / artists with recent searches
- **Detail pages** — Album, Artist (sanitized bio, similar artists, top songs), Playlist
  (drag-reorder, remove, delete)
- **Starred** — songs / albums / artists tabs
- **Playlists** — create, delete, reorder (drag), remove tracks
- **Player bar** — custom-styled progress and volume sliders, shuffle, repeat (off / all /
  one), star current track
- **Queue drawer** — drag to reorder, remove, clear
- **Now Playing fullscreen** — blurred album art background, lyrics (when the server
  returns them), large controls. Exit with the close button or `Esc`.
- **Settings** — max bitrate, crossfade, prefetch toggle, server ping, cache clear
- **OS integration** — Media Session API metadata + actions (lock screen, notification,
  hardware media keys)

### Keyboard shortcuts

| Key                       | Action                  |
| ------------------------- | ----------------------- |
| `Space`                   | Play / pause            |
| `←` / `→`                 | Seek ±10 s              |
| `Shift + ←` / `Shift + →` | Previous / next track   |
| `m`                       | Mute toggle             |
| `f`                       | Toggle fullscreen       |
| `Esc`                     | Close fullscreen        |

---

## Project layout

```
src/
  components/
    layout/       AppLayout
    sidebar/      Sidebar
    player/       PlayerBar, QueueDrawer, NowPlaying
    pages/        Login, Home, Albums, Artists, Songs, Genres,
                  Search, Playlists, PlaylistDetail, AlbumDetail,
                  ArtistDetail, Starred, Settings
    ui/           AlbumCard, ArtistCard, TrackRow, Modal, Toast,
                  Skeleton, ContextMenu, EmptyState, PageHeader, Icon
  lib/            subsonic, player, crypto, utils
  store/          authStore, playerStore, settingsStore, toastStore
  hooks/          useGlobalShortcuts, useStarMutation, useSubsonicConfig
  types/          subsonic
  styles/         global.css

Dockerfile
docker-compose.yml
run.sh
```

---

## Security notes

See also [SECURITY.md](SECURITY.md) for the full transparency statement.

- Passwords are never stored, never logged, never put in URL params. The Subsonic token
  is derived client-side once at login and the password is discarded.
- All Subsonic API calls go through one helper (`src/lib/subsonic.ts`) and use **POST**
  with a form body, so tokens never appear in URLs or server access logs. The only
  exceptions are `stream` and `getCoverArt`, which the browser must fetch as media URLs.
- Server URLs are validated with the `URL` constructor; non-`http(s)` schemes are
  rejected, embedded credentials/query/hash are stripped.
- Any HTML coming back from the server (artist biographies) is run through **DOMPurify**
  with a tag *and* attribute whitelist; bio links are forced to
  `rel="noopener noreferrer"`. Lyrics are rendered as plain text.
- ESLint blocks `dangerouslySetInnerHTML` at lint level (`react/no-danger`).
- **No third-party requests at runtime**: fonts are self-hosted, no CDNs, no analytics,
  no telemetry. The app talks exclusively to the music server you configure.
- Pinned dependency versions (no `^` ranges), `npm audit` clean (0 vulnerabilities).
- The container runs as a non-root user with a read-only filesystem and
  `no-new-privileges`, bound to `127.0.0.1` only.

The Dockerfile only ships a minimal static-file server (`serve`). TLS, security headers,
HSTS, CSP, gzip, and rate limits are expected to be handled by your **external reverse
proxy** — `nginx.example.conf` is a hardened, ready-to-use example (strict CSP with
`script-src 'self'`, rate limiting, modern TLS).

---

## License

MIT — do whatever you want.
