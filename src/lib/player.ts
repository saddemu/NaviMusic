import { Howl } from 'howler';
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
    }
  });
}

function updateMediaSession(song: Song | null): void {
  if (!('mediaSession' in navigator)) return;
  const config = useAuthStore.getState().config;
  if (!song || !config) {
    navigator.mediaSession.metadata = null;
    return;
  }
  const art = coverArtUrl(config, song.coverArt, 512);
  navigator.mediaSession.metadata = new MediaMetadata({
    title: song.title,
    artist: song.artist ?? '',
    album: song.album ?? '',
    artwork: art ? [{ src: art, sizes: '512x512', type: 'image/jpeg' }] : [],
  });
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
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    },
    onpause: () => {
      usePlayerStore.getState()._setIsPlaying(false);
      stopProgressTimer();
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
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
  }
}
