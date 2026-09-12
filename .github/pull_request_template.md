## What this changes

<!-- One or two sentences. Link an issue if there is one. -->

## Checks

- [ ] `npm run lint && npm run typecheck && npm run build` passes locally
- [ ] No new dependency, or the new one is pinned exactly (no `^` / `~`)
- [ ] No third-party request at runtime (no CDN, font, analytics, telemetry)
- [ ] Any server call goes through `request()` in `src/lib/subsonic.ts`
- [ ] Any server-supplied HTML goes through `sanitizeBio()` / DOMPurify
- [ ] No credential, token, or server hostname in the diff

## Anything reviewers should know

<!-- Trade-offs, follow-ups, things you were unsure about. -->
