import { useEffect } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { seekCurrent } from '@/lib/player';

function isInputTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;
}

export function useGlobalShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isInputTarget(e.target)) return;
      const player = usePlayerStore.getState();
      switch (e.key) {
        case ' ':
          if (!player.currentSong) return;
          e.preventDefault();
          player.togglePlay();
          break;
        case 'ArrowRight':
          if (e.shiftKey) {
            e.preventDefault();
            player.next();
          } else {
            e.preventDefault();
            seekCurrent(Math.min(player.duration || 0, player.progress + 10));
          }
          break;
        case 'ArrowLeft':
          if (e.shiftKey) {
            e.preventDefault();
            player.prev();
          } else {
            e.preventDefault();
            seekCurrent(Math.max(0, player.progress - 10));
          }
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          player.toggleMute();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          player.toggleFullscreen();
          break;
        case 'Escape':
          if (player.isFullscreen) {
            e.preventDefault();
            player.setFullscreen(false);
          } else if (player.isLyricsOpen) {
            e.preventDefault();
            player.setLyricsDrawer(false);
          } else if (player.isQueueOpen) {
            e.preventDefault();
            player.setQueueDrawer(false);
          }
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
