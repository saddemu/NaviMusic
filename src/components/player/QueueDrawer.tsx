import { useState } from 'react';
import { coverArtUrl } from '@/lib/subsonic';
import { useAuthStore } from '@/store/authStore';
import { usePlayerStore } from '@/store/playerStore';
import { CloseIcon, DragIcon } from '../ui/Icon';
import styles from './QueueDrawer.module.css';

export default function QueueDrawer() {
  const config = useAuthStore((s) => s.config);
  const isOpen = usePlayerStore((s) => s.isQueueOpen);
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const setQueueDrawer = usePlayerStore((s) => s.setQueueDrawer);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const reorderQueue = usePlayerStore((s) => s.reorderQueue);
  const clearQueue = usePlayerStore((s) => s.clearQueue);
  const playQueue = usePlayerStore((s) => s.playQueue);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  return (
    <>
      <div
        className={`${styles.backdrop}${isOpen ? ' ' + styles.open : ''}`}
        onClick={() => setQueueDrawer(false)}
        aria-hidden
      />
      <aside
        className={`${styles.drawer}${isOpen ? ' ' + styles.open : ''}`}
        aria-label="Play queue"
        aria-hidden={!isOpen}
      >
        <div className={styles.header}>
          <h2>Up Next</h2>
          <button
            className={styles.iconBtn}
            onClick={() => setQueueDrawer(false)}
            aria-label="Close queue"
            type="button"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className={styles.list}>
          {queue.length === 0 && <div className={styles.empty}>Your queue is empty.</div>}
          {queue.map((song, idx) => {
            const isCurrent = idx === currentIndex;
            const isDragging = dragIndex === idx;
            const cover = config ? coverArtUrl(config, song.coverArt, 80) : '';
            return (
              <div
                key={`${song.id}-${idx}`}
                className={`${styles.item}${isCurrent ? ' ' + styles.current : ''}${
                  isDragging ? ' ' + styles.dragging : ''
                }`}
                draggable
                onDragStart={() => setDragIndex(idx)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverIndex(idx);
                }}
                onDrop={() => {
                  if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
                    reorderQueue(dragIndex, overIndex);
                  }
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                onDoubleClick={() => playQueue(queue, idx)}
              >
                <span className={styles.handle} aria-hidden>
                  <DragIcon size={14} />
                </span>
                <div className={styles.cover}>
                  {cover && <img src={cover} alt="" loading="lazy" />}
                </div>
                <div className={styles.info}>
                  <div className={styles.title}>{song.title}</div>
                  <div className={styles.artist}>{song.artist}</div>
                </div>
                <button
                  className={styles.removeBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromQueue(idx);
                  }}
                  aria-label="Remove from queue"
                  type="button"
                >
                  <CloseIcon size={14} />
                </button>
              </div>
            );
          })}
        </div>

        <div className={styles.footer}>
          <span>{queue.length} tracks</span>
          {queue.length > 0 && (
            <button className={styles.clear} onClick={clearQueue} type="button">
              Clear
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
