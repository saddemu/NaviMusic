import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { coverArtUrl } from '@/lib/subsonic';
import { useAuthStore } from '@/store/authStore';
import { usePlayerStore } from '@/store/playerStore';
import { seekCurrent } from '@/lib/player';
import { useLyrics, activeLineIndex } from '@/hooks/useLyrics';
import { formatDuration } from '@/lib/utils';
import {
  CloseIcon,
  LyricsIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  RepeatIcon,
  ShuffleIcon,
} from '../ui/Icon';
import styles from './NowPlaying.module.css';

export default function NowPlaying() {
  const isOpen = usePlayerStore((s) => s.isFullscreen);
  const setOpen = usePlayerStore((s) => s.setFullscreen);
  const config = useAuthStore((s) => s.config);
  const song = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const progress = usePlayerStore((s) => s.progress);
  const duration = usePlayerStore((s) => s.duration);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);

  const [scrubbing, setScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const [showLyrics, setShowLyrics] = useState(false);
  const sliderRef = useRef<HTMLInputElement>(null);
  const lyricsBoxRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Array<HTMLDivElement | null>>([]);

  const { data: lyrics, isLoading: lyricsLoading } = useLyrics(song, isOpen && showLyrics);
  const activeIdx = activeLineIndex(lyrics ?? null, progress);
  const hasLyrics = !!lyrics && lyrics.line.length > 0;
  const showLyricsCol = showLyrics;

  const total = duration || song?.duration || 0;
  const displayedProgress = scrubbing ? scrubValue : progress;
  const progressPct = total > 0 ? (displayedProgress / total) * 100 : 0;

  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.style.setProperty('--progress', `${progressPct}%`);
    }
  }, [progressPct]);

  useEffect(() => {
    if (!isOpen || !showLyrics || !hasLyrics || activeIdx < 0) return;
    const el = lineRefs.current[activeIdx];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeIdx, isOpen, showLyrics, hasLyrics]);

  if (!isOpen || !song) return null;

  const cover = config ? coverArtUrl(config, song.coverArt, 1200) : '';

  return (
    <div className={styles.overlay} role="dialog" aria-label="Now playing">
      {cover && (
        <div className={styles.bgLayer} aria-hidden>
          <img src={cover} alt="" />
        </div>
      )}
      <div className={styles.bgOverlay} aria-hidden />

      <div className={styles.topBar}>
        <span className={styles.eyebrow}>Playing now</span>
        <div className={styles.topBarRight}>
          <button
            className={`${styles.iconBtn}${showLyrics ? ' ' + styles.iconBtnActive : ''}`}
            onClick={() => setShowLyrics((v) => !v)}
            aria-pressed={showLyrics}
            aria-label={showLyrics ? 'Hide lyrics' : 'Show lyrics'}
            title={showLyrics ? 'Hide lyrics' : 'Show lyrics'}
            type="button"
          >
            <LyricsIcon size={20} />
          </button>
          <button
            className={styles.iconBtn}
            onClick={() => setOpen(false)}
            aria-label="Close fullscreen player"
            type="button"
          >
            <CloseIcon size={20} />
          </button>
        </div>
      </div>

      <div className={`${styles.body}${!showLyricsCol ? ' ' + styles.bodyNoLyrics : ''}`}>
        <div className={styles.albumArt}>
          {cover && <img src={cover} alt={song.title} />}
        </div>
        {showLyricsCol && (
          <div className={styles.lyricsCol}>
            <div className={styles.heading}>
              <h2 className={styles.songTitle}>{song.title}</h2>
              <span className={styles.artistName}>
                {song.artist}
                {song.album ? ` — ${song.album}` : ''}
              </span>
            </div>
            <div
              className={`${styles.lyricsBox}${lyrics?.synced ? ' ' + styles.synced : ''}`}
              ref={lyricsBoxRef}
            >
              {hasLyrics ? (
                lyrics!.line.map((line, i) => {
                  const isActive = i === activeIdx;
                  const isPast = activeIdx >= 0 && i < activeIdx;
                  return (
                    <div
                      key={i}
                      ref={(el) => {
                        lineRefs.current[i] = el;
                      }}
                      className={`${styles.lyricLine}${isActive ? ' ' + styles.active : ''}${
                        isPast ? ' ' + styles.past : ''
                      }`}
                      onClick={() => {
                        if (lyrics!.synced && line.start !== undefined) {
                          seekCurrent(line.start / 1000);
                        }
                      }}
                    >
                      {line.value || ' '}
                    </div>
                  );
                })
              ) : (
                <div className={styles.noLyricsHint}>
                  {lyricsLoading ? 'Loading lyrics…' : 'No lyrics available for this track.'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className={styles.controls}>
        {!showLyricsCol && (
          <div className={styles.metaCenter}>
            <h2 className={styles.songTitle} style={{ fontSize: 32 }}>
              {song.title}
            </h2>
            <span className={styles.artistName}>{song.artist}</span>
          </div>
        )}
        <div className={styles.progressRow}>
          <span className={`${styles.time} ${styles.timeElapsed}`}>
            {formatDuration(displayedProgress)}
          </span>
          <input
            ref={sliderRef}
            type="range"
            className="pm-range"
            min={0}
            max={total || 1}
            step={0.1}
            value={displayedProgress}
            onChange={(e) => {
              setScrubbing(true);
              setScrubValue(Number(e.target.value));
            }}
            onMouseUp={() => {
              if (scrubbing) {
                seekCurrent(scrubValue);
                setScrubbing(false);
              }
            }}
            onTouchEnd={() => {
              if (scrubbing) {
                seekCurrent(scrubValue);
                setScrubbing(false);
              }
            }}
            style={{ flex: 1 } as CSSProperties}
            aria-label="Seek"
          />
          <span className={styles.time}>{formatDuration(total)}</span>
        </div>
        <div className={styles.controlsRow}>
          <button
            className={styles.ctrl}
            onClick={toggleShuffle}
            aria-pressed={shuffle}
            aria-label="Shuffle"
            style={{ color: shuffle ? 'var(--accent)' : undefined }}
            type="button"
          >
            <ShuffleIcon size={20} />
          </button>
          <button className={styles.ctrl} onClick={prev} aria-label="Previous track" type="button">
            <PrevIcon size={26} />
          </button>
          <button
            className={styles.playBtn}
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            type="button"
          >
            {isPlaying ? <PauseIcon size={28} /> : <PlayIcon size={28} />}
          </button>
          <button className={styles.ctrl} onClick={next} aria-label="Next track" type="button">
            <NextIcon size={26} />
          </button>
          <button
            className={styles.ctrl}
            onClick={cycleRepeat}
            aria-label={`Repeat ${repeat}`}
            style={{ color: repeat !== 'off' ? 'var(--accent)' : undefined }}
            type="button"
          >
            <RepeatIcon size={20} mode={repeat} />
          </button>
        </div>
      </div>
    </div>
  );
}
