import { Howl, Howler } from 'howler';
import { usePlayerStore } from '@/store/playerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { coverArtUrl, scrobble, streamUrl } from './subsonic';
import type { Song } from '@/types/subsonic';

let current: Howl | null = null;
let preloaded: { id: string; howl: Howl } | null = null;
let progressTimer: number | null = null;
let lastSongId: string | null = null;
let scrobbledForSongId: string | null = null;
let mediaSessionWired = false;
let retriedForId: string | null = null;
let lastPositionPush = 0;

/*
 * Background playback (installed PWA, screen off, app switched away) rests on
 * three things:
 *
 *  - every Howl is `html5: true`, so playback runs through an <audio> element.
 *    The Web Audio path is suspended by iOS the moment the page is hidden;
 *    media elements are not.
 *  - Howler is told not to auto-suspend its shared AudioContext. Left on, it
 *    tears the context down after 30s of silence and the next unlock has to
 *    come from a user gesture the backgrounded app will never receive.
 *  - the Media Session is kept current, which is what the lock screen, the
 *    notification and the car head unit actually read.
 */
Howler.autoSuspend = false;

/** How often position is pushed to the OS. Cheap, but not every 250ms tick. */
const POSITION_PUSH_MS = 1000;

function pushPositionState(force = false): void {
  if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
  const now = Date.now();
  if (!force && now - lastPositionPush < POSITION_PUSH_MS) return;
  lastPositionPush = now;

  const state = usePlayerStore.getState();
  const duration = state.duration || state.currentSong?.duration || 0;
  const position = state.progress;
  // The spec throws on a position past the end or a non-finite duration.
  if (!Number.isFinite(duration) || duration <= 0) return;
  try {
    navigator.mediaSession.setPositionState({
      duration,
      position: Math.min(Math.max(position, 0), duration),
      playbackRate: 1,
    });
  } catch {
    // Some engines reject states they dislike; losing the scrubber is not
    // worth breaking playback over.
  }
}

function setupMediaSession(): void {
  if (mediaSessionWired || typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
    return;
  }
  mediaSessionWired = true;
  navigator.mediaSession.setActionHandler('play', () => usePlayerStore.getState().resume());
  navigator.mediaSession.setActionHandler('pause', () => usePlayerStore.getState().pause());
  navigator.mediaSession.setActionHandler('previoustrack', () => usePlayerStore.getState().prev());
  navigator.mediaSession.setActionHandler('nexttrack', () => usePlayerStore.getState().next());
  navigator.mediaSession.setActionHandler('seekto', (details) => {
    if (details.seekTime !== undefined && current) {
      current.seek(details.seekTime);
      usePlayerStore.getState().seek(details.seekTime);
      pushPositionState(true);
    }
  });

  // Lock-screen and headset skip buttons. `setActionHandler` throws on an
  // action the engine does not know, so each one is guarded separately.
  const relativeSeek = (delta: number) => {
    if (!current) return;
    const state = usePlayerStore.getState();
    const total = state.duration || state.currentSong?.duration || 0;
    const target = Math.min(Math.max(state.progress + delta, 0), total > 0 ? total : Infinity);
    current.seek(target);
    state.seek(target);
    pushPositionState(true);
  };

  const optional: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
    ['stop', () => usePlayerStore.getState().pause()],
    ['seekbackward', (d) => relativeSeek(-(d.seekOffset ?? 10))],
    ['seekforward', (d) => relativeSeek(d.seekOffset ?? 10)],
  ];
  for (const [action, handler] of optional) {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {
      // Unsupported on this engine — nothing to fall back to.
    }
  }
}

function updateMediaSession(song: Song | null): void {
  if (!('mediaSession' in navigator)) return;
  const config = useAuthStore.getState().config;
  if (!song || !config) {
    navigator.mediaSession.metadata = null;
    return;
  }
  // Several sizes: a lock screen wants the big one, a notification shade the
  // small one, and letting the OS choose avoids it downscaling 512px art for
  // a 96px slot on every track change.
  const artwork = [96, 256, 512].map((size) => ({
    src: coverArtUrl(config, song.coverArt, size),
    sizes: `${size}x${size}`,
    type: 'image/jpeg',
  }));
  navigator.mediaSession.metadata = new MediaMetadata({
    title: song.title,
    artist: song.artist ?? '',
    album: song.album ?? '',
    artwork: artwork[0].src ? artwork : [],
  });
  pushPositionState(true);
}

function startProgressTimer(): void {
  stopProgressTimer();
  const tick = () => {
    if (!current) return;
    const seek = current.seek();
    const rawDur = current.duration();
    if (typeof seek === 'number') {
      const state = usePlayerStore.getState();
      const safeDur =
        Number.isFinite(rawDur) && rawDur > 0
          ? rawDur
          : (state.currentSong?.duration ?? state.duration);
      state._setProgress(seek, safeDur);
      pushPositionState();
      // Scrobble at 50% (or 4min) — once per song
      if (
        scrobbledForSongId !== state.currentSong?.id &&
        state.currentSong &&
        safeDur > 0 &&
        (seek / safeDur > 0.5 || seek > 240)
      ) {
        scrobbledForSongId = state.currentSong.id;
        const config = useAuthStore.getState().config;
        if (config) scrobble(config, state.currentSong.id, true).catch(() => {});
      }
      // Preload next when near end
      const settings = useSettingsStore.getState();
      if (settings.prefetchNext && safeDur > 0 && seek / safeDur > 0.8) {
        preloadNext();
      }
    }
    progressTimer = window.setTimeout(tick, 250);
  };
  tick();
}

function stopProgressTimer(): void {
  if (progressTimer !== null) {
    clearTimeout(progressTimer);
    progressTimer = null;
  }
}

function buildHowl(song: Song): Howl | null {
  const config = useAuthStore.getState().config;
  if (!config) return null;
  const settings = useSettingsStore.getState();
  const url = streamUrl(
    config,
    song.id,
    settings.maxBitrate || undefined,
    settings.maxBitrate ? 'mp3' : 'raw',
  );
  return new Howl({
    src: [url],
    html5: true,
    format: ['mp3', 'ogg', 'flac', 'opus', 'm4a', 'aac', 'wav'],
    volume: usePlayerStore.getState().isMuted ? 0 : usePlayerStore.getState().volume,
    onend: () => {
      const state = usePlayerStore.getState();
      if (state.repeat === 'one') {
        current?.seek(0);
        current?.play();
        return;
      }
      state._onEnded();
    },
    onloaderror: (_id, _err) => {
      const state = usePlayerStore.getState();
      const songId = state.currentSong?.id;
      if (songId && retriedForId !== songId) {
        retriedForId = songId;
        // Retry once
        playCurrent();
      } else {
        state.next();
      }
    },
    onplayerror: () => {
      // Mobile autoplay restrictions — try unlocking
      current?.once('unlock', () => current?.play());
    },
    onplay: () => {
      usePlayerStore.getState()._setIsPlaying(true);
      startProgressTimer();
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
        pushPositionState(true);
      }
    },
    onpause: () => {
      usePlayerStore.getState()._setIsPlaying(false);
      stopProgressTimer();
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
        pushPositionState(true);
      }
    },
    onstop: () => {
      stopProgressTimer();
    },
  });
}

function preloadNext(): void {
  const state = usePlayerStore.getState();
  const nextIdx = state.currentIndex + 1;
  if (nextIdx >= state.queue.length) return;
  const nextSong = state.queue[nextIdx];
  if (!nextSong) return;
  if (preloaded?.id === nextSong.id) return;
  preloaded?.howl.unload();
  const howl = buildHowl(nextSong);
  if (howl) preloaded = { id: nextSong.id, howl };
}

function playCurrent(): void {
  setupMediaSession();
  const state = usePlayerStore.getState();
  const song = state.currentSong;
  if (!song) {
    current?.stop();
    current?.unload();
    current = null;
    return;
  }

  if (lastSongId === song.id && current) {
    if (state.isPlaying && !current.playing()) current.play();
    if (!state.isPlaying && current.playing()) current.pause();
    return;
  }

  current?.stop();
  current?.unload();

  if (preloaded?.id === song.id) {
    current = preloaded.howl;
    preloaded = null;
  } else {
    preloaded?.howl.unload();
    preloaded = null;
    const built = buildHowl(song);
    if (!built) return;
    current = built;
  }

  current.volume(state.isMuted ? 0 : state.volume);
  lastSongId = song.id;
  scrobbledForSongId = null;
  retriedForId = null;
  updateMediaSession(song);
  if (state.isPlaying) current.play();
}

let lastIsPlaying = false;
let lastVolume = -1;
let lastMuted = false;
let lastSeek = 0;

export function startAudioEngine(): () => void {
  // React to player store changes
  const unsubscribe = usePlayerStore.subscribe((state) => {
    // Song or play state change
    if (state.currentSong?.id !== lastSongId) {
      playCurrent();
    } else if (state.isPlaying !== lastIsPlaying && current) {
      if (state.isPlaying && !current.playing()) current.play();
      if (!state.isPlaying && current.playing()) current.pause();
    }
    lastIsPlaying = state.isPlaying;

    // Volume / mute
    const effectiveVolume = state.isMuted ? 0 : state.volume;
    if (current && (state.volume !== lastVolume || state.isMuted !== lastMuted)) {
      current.volume(effectiveVolume);
      lastVolume = state.volume;
      lastMuted = state.isMuted;
    }

    // External seek — if progress diverges from Howl's reported seek by >1s, jump
    if (current && Math.abs(state.progress - lastSeek) > 1.5 && state.progress >= 0) {
      const diff = Math.abs((current.seek() as number) - state.progress);
      if (diff > 1.5) current.seek(state.progress);
    }
    lastSeek = state.progress;
  });

  return () => {
    unsubscribe();
    stopProgressTimer();
    current?.stop();
    current?.unload();
    preloaded?.howl.unload();
    current = null;
    preloaded = null;
  };
}

export function seekCurrent(seconds: number): void {
  if (current) {
    current.seek(seconds);
    usePlayerStore.getState()._setProgress(seconds, current.duration());
    pushPositionState(true);
  }
}
