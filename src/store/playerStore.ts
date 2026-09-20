import { create } from 'zustand';
import type { Song } from '@/types/subsonic';
import { shuffleArray } from '@/lib/utils';

// Pre-rename key name, kept so the saved volume survives the move to NaviMusic.
const VOLUME_KEY = 'pmusic.volume';

function loadVolume(): number {
  const raw = localStorage.getItem(VOLUME_KEY);
  const parsed = raw ? Number.parseFloat(raw) : 0.85;
  return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 0.85;
}

interface PlayerStore {
  queue: Song[];
  originalQueue: Song[];
  currentIndex: number;
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  isQueueOpen: boolean;
  isLyricsOpen: boolean;
  isFullscreen: boolean;

  playSong: (song: Song, queue?: Song[]) => void;
  playQueue: (songs: Song[], startIndex?: number) => void;
  playShuffled: (songs: Song[]) => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (positionSeconds: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (song: Song) => void;
  addNext: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (from: number, to: number) => void;
  clearQueue: () => void;
  toggleQueueDrawer: () => void;
  setQueueDrawer: (open: boolean) => void;
  toggleLyricsDrawer: () => void;
  setLyricsDrawer: (open: boolean) => void;
  toggleFullscreen: () => void;
  setFullscreen: (open: boolean) => void;

  // Internal — wired from audio engine
  _setProgress: (progress: number, duration: number) => void;
  _setIsPlaying: (playing: boolean) => void;
  _onEnded: () => void;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  queue: [],
  originalQueue: [],
  currentIndex: -1,
  currentSong: null,
  isPlaying: false,
  progress: 0,
  duration: 0,
  volume: loadVolume(),
  isMuted: false,
  shuffle: false,
  repeat: 'all',
  isQueueOpen: false,
  isLyricsOpen: false,
  isFullscreen: false,

  playSong: (song, queue) => {
    const q = queue ?? [song];
    const idx = q.findIndex((s) => s.id === song.id);
    set({
      queue: q,
      originalQueue: q,
      currentIndex: idx >= 0 ? idx : 0,
      currentSong: song,
      isPlaying: true,
      progress: 0,
    });
  },

  playQueue: (songs, startIndex = 0) => {
    if (songs.length === 0) return;
    const idx = Math.max(0, Math.min(startIndex, songs.length - 1));
    set({
      queue: songs,
      originalQueue: songs,
      currentIndex: idx,
      currentSong: songs[idx],
      isPlaying: true,
      progress: 0,
    });
  },

  playShuffled: (songs) => {
    if (songs.length === 0) return;
    const shuffled = shuffleArray(songs);
    set({
      queue: shuffled,
      originalQueue: songs,
      currentIndex: 0,
      currentSong: shuffled[0],
      isPlaying: true,
      progress: 0,
      shuffle: true,
    });
  },

  pause: () => set({ isPlaying: false }),
  resume: () => {
    if (get().currentSong) set({ isPlaying: true });
  },
  togglePlay: () => {
    const { isPlaying, currentSong } = get();
    if (currentSong) set({ isPlaying: !isPlaying });
  },

  next: () => {
    const { queue, currentIndex, repeat } = get();
    if (queue.length === 0) return;
    if (repeat === 'one') {
      set({ progress: 0, isPlaying: true });
      return;
    }
    const nextIdx = currentIndex + 1;
    if (nextIdx >= queue.length) {
      if (repeat === 'all') {
        set({ currentIndex: 0, currentSong: queue[0], progress: 0, isPlaying: true });
      } else {
        set({ isPlaying: false, progress: 0 });
      }
      return;
    }
    set({
      currentIndex: nextIdx,
      currentSong: queue[nextIdx],
      progress: 0,
      isPlaying: true,
    });
  },

  prev: () => {
    const { queue, currentIndex, progress } = get();
    if (queue.length === 0) return;
    if (progress > 3) {
      set({ progress: 0 });
      return;
    }
    const prevIdx = Math.max(0, currentIndex - 1);
    set({
      currentIndex: prevIdx,
      currentSong: queue[prevIdx],
      progress: 0,
      isPlaying: true,
    });
  },

  seek: (positionSeconds) => set({ progress: positionSeconds }),

  setVolume: (v) => {
    const clamped = Math.min(1, Math.max(0, v));
    localStorage.setItem(VOLUME_KEY, String(clamped));
    set({ volume: clamped, isMuted: clamped === 0 ? get().isMuted : false });
  },

  toggleMute: () => set({ isMuted: !get().isMuted }),

  toggleShuffle: () => {
    const { shuffle, queue, originalQueue, currentSong } = get();
    if (!shuffle) {
      // Turning on — shuffle the rest of the queue while keeping current song where it is
      if (!currentSong) {
        set({ shuffle: true });
        return;
      }
      const idx = queue.findIndex((s) => s.id === currentSong.id);
      const before = queue.slice(0, idx + 1);
      const after = queue.slice(idx + 1);
      const shuffled = [...before, ...shuffleArray(after)];
      set({ shuffle: true, queue: shuffled, originalQueue: queue });
    } else {
      // Turning off — restore original order
      const idx = currentSong ? originalQueue.findIndex((s) => s.id === currentSong.id) : 0;
      set({
        shuffle: false,
        queue: originalQueue,
        currentIndex: idx >= 0 ? idx : 0,
      });
    }
  },

  cycleRepeat: () => {
    const order: PlayerStore['repeat'][] = ['off', 'all', 'one'];
    const next = order[(order.indexOf(get().repeat) + 1) % order.length];
    set({ repeat: next });
  },

  addToQueue: (song) => {
    const { queue, originalQueue } = get();
    set({ queue: [...queue, song], originalQueue: [...originalQueue, song] });
  },

  addNext: (song) => {
    const { queue, currentIndex, originalQueue } = get();
    const next = [...queue];
    next.splice(currentIndex + 1, 0, song);
    set({ queue: next, originalQueue: [...originalQueue, song] });
  },

  removeFromQueue: (index) => {
    const { queue, currentIndex, currentSong } = get();
    if (index < 0 || index >= queue.length) return;
    const next = queue.filter((_, i) => i !== index);
    let nextIndex = currentIndex;
    if (index < currentIndex) nextIndex -= 1;
    else if (index === currentIndex) {
      nextIndex = Math.min(currentIndex, next.length - 1);
    }
    set({
      queue: next,
      currentIndex: next.length === 0 ? -1 : nextIndex,
      currentSong: next.length === 0 ? null : (next[nextIndex] ?? currentSong),
      isPlaying: next.length === 0 ? false : get().isPlaying,
    });
  },

  reorderQueue: (from, to) => {
    const { queue, currentSong } = get();
    if (from === to || from < 0 || to < 0 || from >= queue.length || to >= queue.length) return;
    const next = [...queue];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    const newIndex = currentSong ? next.findIndex((s) => s.id === currentSong.id) : -1;
    set({ queue: next, currentIndex: newIndex });
  },

  clearQueue: () =>
    set({
      queue: [],
      originalQueue: [],
      currentIndex: -1,
      currentSong: null,
      isPlaying: false,
      progress: 0,
    }),

  toggleQueueDrawer: () => set({ isQueueOpen: !get().isQueueOpen, isLyricsOpen: false }),
  setQueueDrawer: (open) =>
    set({ isQueueOpen: open, isLyricsOpen: open ? false : get().isLyricsOpen }),
  toggleLyricsDrawer: () => set({ isLyricsOpen: !get().isLyricsOpen, isQueueOpen: false }),
  setLyricsDrawer: (open) =>
    set({ isLyricsOpen: open, isQueueOpen: open ? false : get().isQueueOpen }),
  toggleFullscreen: () => set({ isFullscreen: !get().isFullscreen }),
  setFullscreen: (open) => set({ isFullscreen: open }),

  _setProgress: (progress, duration) => set({ progress, duration }),
  _setIsPlaying: (playing) => set({ isPlaying: playing }),
  _onEnded: () => get().next(),
}));
