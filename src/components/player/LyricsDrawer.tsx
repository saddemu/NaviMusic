import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { useLyrics, activeLineIndex } from '@/hooks/useLyrics';
import { seekCurrent } from '@/lib/player';
import { CloseIcon } from '../ui/Icon';
import styles from './LyricsDrawer.module.css';

export default function LyricsDrawer() {
  const isOpen = usePlayerStore((s) => s.isLyricsOpen);
  const setOpen = usePlayerStore((s) => s.setLyricsDrawer);
  const song = usePlayerStore((s) => s.currentSong);
  const progress = usePlayerStore((s) => s.progress);

  const { data: lyrics, isLoading } = useLyrics(song, isOpen);

  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Array<HTMLDivElement | null>>([]);

  const activeIdx = activeLineIndex(lyrics ?? null, progress);

  // Scroll the active line into view
  useEffect(() => {
    if (!isOpen || activeIdx < 0) return;
    const el = lineRefs.current[activeIdx];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeIdx, isOpen]);

  return (
    <>
      <div
        className={`${styles.backdrop}${isOpen ? ' ' + styles.open : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <aside
        className={`${styles.drawer}${isOpen ? ' ' + styles.open : ''}`}
        aria-label="Lyrics"
        aria-hidden={!isOpen}
      >
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            <h2>Lyrics</h2>
            {song && (
              <div className={styles.subtitle}>
                {song.title}
                {song.artist ? ` — ${song.artist}` : ''}
              </div>
            )}
          </div>
          <button
            className={styles.iconBtn}
            onClick={() => setOpen(false)}
            aria-label="Close lyrics"
            type="button"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {lyrics && !lyrics.synced && lyrics.line.length > 0 && (
          <div className={styles.unsyncedHint}>Unsynced</div>
        )}

        <div className={styles.body} ref={containerRef}>
          {isLoading && <div className={styles.empty}>Loading lyrics…</div>}
          {!isLoading && (!lyrics || lyrics.line.length === 0) && (
            <div className={styles.empty}>
              {song ? 'No lyrics available for this track.' : 'Nothing playing.'}
            </div>
          )}
          {!isLoading &&
            lyrics?.line.map((line, i) => {
              const isActive = i === activeIdx;
              const isPast = activeIdx >= 0 && i < activeIdx;
              const cls = `${styles.line}${isActive ? ' ' + styles.active : ''}${
                isPast ? ' ' + styles.past : ''
              }`;
              return (
                <div
                  key={i}
                  ref={(el) => {
                    lineRefs.current[i] = el;
                  }}
                  className={cls}
                  onClick={() => {
                    if (lyrics.synced && line.start !== undefined) {
                      seekCurrent(line.start / 1000);
                    }
                  }}
                >
                  {line.value || ' '}
                </div>
              );
            })}
        </div>
      </aside>
    </>
  );
}
