import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { coverArtUrl } from '@/lib/subsonic';
import { usePlayerStore } from '@/store/playerStore';
import { useAuthStore } from '@/store/authStore';
import { formatDuration } from '@/lib/utils';
import { useStarMutation } from '@/hooks/useStarMutation';
import { useUiStore } from '@/store/uiStore';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { seekCurrent } from '@/lib/player';
import {
  ExpandIcon,
  HeartIcon,
  LyricsIcon,
  MutedIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  QueueIcon,
  RepeatIcon,
  ShuffleIcon,
  VolumeIcon,
} from '../ui/Icon';
import Tooltip from '../ui/Tooltip';
import styles from './PlayerBar.module.css';

const REPEAT_LABEL: Record<'off' | 'all' | 'one', string> = {
  off: 'Repeat off',
  all: 'Repeat queue',
  one: 'Repeat track',
};

export default function PlayerBar() {
  const config = useAuthStore((s) => s.config);
  const song = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const progress = usePlayerStore((s) => s.progress);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);

  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleMute = usePlayerStore((s) => s.toggleMute);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const toggleQueueDrawer = usePlayerStore((s) => s.toggleQueueDrawer);
  const toggleLyricsDrawer = usePlayerStore((s) => s.toggleLyricsDrawer);
  const isQueueOpen = usePlayerStore((s) => s.isQueueOpen);
  const isLyricsOpen = usePlayerStore((s) => s.isLyricsOpen);
  const toggleFullscreen = usePlayerStore((s) => s.toggleFullscreen);
  const setFullscreenOrigin = useUiStore((s) => s.setFullscreenOrigin);

  const coverRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Anchor the fullscreen player to the artwork it grew out of.
  const expand = () => {
    const r = coverRef.current?.getBoundingClientRect();
    if (r) setFullscreenOrigin({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    toggleFullscreen();
  };

  // On a phone the whole strip opens the fullscreen player: a 44px square of
  // artwork is a poor target next to a bar the thumb is already resting on.
  // Anything genuinely interactive inside it keeps its own job.
  const onBarClick = (e: React.MouseEvent) => {
    if (!isMobile || !song) return;
    if ((e.target as HTMLElement).closest('button, a, input, [role="button"]')) return;
    expand();
  };

  const star = useStarMutation();

  // Local state for scrubbing — avoid driving Howl on every frame
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const sliderRef = useRef<HTMLInputElement>(null);

  const totalDuration = duration || song?.duration || 0;
  const displayedProgress = scrubbing ? scrubValue : progress;
  const progressPct = totalDuration > 0 ? (displayedProgress / totalDuration) * 100 : 0;

  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.style.setProperty('--progress', `${progressPct}%`);
    }
  }, [progressPct]);

  const cover = config && song ? coverArtUrl(config, song.coverArt, 200) : '';
  const isStarred = !!song?.starred;
  const volumePct = (isMuted ? 0 : volume) * 100;

  return (
    <div className={styles.bar} role="region" aria-label="Music player" onClick={onBarClick}>
      {/* Phone only. There is no room for a scrubber down there, so the bar
          reports position as a hairline along its own top edge instead. */}
      <div className={styles.miniProgress} aria-hidden="true">
        <span style={{ width: `${progressPct}%` }} />
      </div>
      <div className={styles.left}>
        {song ? (
          <>
            <div
              ref={coverRef}
              className={styles.cover}
              onClick={expand}
              role="button"
              tabIndex={0}
              aria-label="Open now playing"
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && expand()}
            >
              {cover ? <img src={cover} alt="" loading="lazy" /> : null}
              <span className={styles.expandHint}>
                <ExpandIcon size={20} />
              </span>
            </div>
            <div className={styles.meta}>
              <span className={styles.title}>{song.title}</span>
              <span className={styles.artist}>
                {song.artistId ? (
                  <Link to={`/artist/${song.artistId}`}>{song.artist}</Link>
                ) : (
                  song.artist
                )}
              </span>
            </div>
            <Tooltip label={isStarred ? 'Remove from starred' : 'Add to starred'}>
              <button
                className={`${styles.heart}${isStarred ? ' ' + styles.active : ''}`}
                onClick={() => star.mutate({ id: song.id, starred: isStarred })}
                aria-label={isStarred ? 'Unstar' : 'Star'}
                aria-pressed={isStarred}
                type="button"
              >
                <HeartIcon size={16} filled={isStarred} />
              </button>
            </Tooltip>
          </>
        ) : (
          <div className={styles.meta}>
            <span className={styles.artist}>Nothing playing</span>
          </div>
        )}
      </div>

      <div className={styles.center}>
        <div className={styles.controls}>
          <Tooltip label={shuffle ? 'Shuffle on' : 'Shuffle off'}>
            <button
              className={`${styles.ctrl} ${styles.wideOnly}${shuffle ? ' ' + styles.active : ''}`}
              onClick={toggleShuffle}
              aria-label="Shuffle"
              aria-pressed={shuffle}
              type="button"
            >
              <ShuffleIcon size={16} />
            </button>
          </Tooltip>
          <Tooltip label="Previous">
            <button
              className={`${styles.ctrl} ${styles.wideOnly}`}
              onClick={prev}
              aria-label="Previous track"
              disabled={!song}
              type="button"
            >
              <PrevIcon size={20} />
            </button>
          </Tooltip>
          <Tooltip label={isPlaying ? 'Pause' : 'Play'}>
            <button
              className={styles.playBtn}
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              disabled={!song}
              type="button"
            >
              {isPlaying ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
            </button>
          </Tooltip>
          <Tooltip label="Next">
            <button
              className={styles.ctrl}
              onClick={next}
              aria-label="Next track"
              disabled={!song}
              type="button"
            >
              <NextIcon size={20} />
            </button>
          </Tooltip>
          <Tooltip label={REPEAT_LABEL[repeat]}>
            <button
              className={`${styles.ctrl} ${styles.wideOnly}${repeat !== 'off' ? ' ' + styles.active : ''}`}
              onClick={cycleRepeat}
              aria-label={`Repeat ${repeat}`}
              type="button"
            >
              <RepeatIcon size={16} mode={repeat} />
            </button>
          </Tooltip>
        </div>

        <div className={styles.progressRow}>
          <span className={`${styles.time} ${styles.timeElapsed}`}>
            {formatDuration(displayedProgress)}
          </span>
          <input
            ref={sliderRef}
            type="range"
            className="pm-range"
            min={0}
            max={totalDuration || 1}
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
            onKeyUp={() => {
              if (scrubbing) {
                seekCurrent(scrubValue);
                setScrubbing(false);
              }
            }}
            disabled={!song}
            aria-label="Seek"
            role="progressbar"
            aria-valuenow={Math.floor(displayedProgress)}
            aria-valuemin={0}
            aria-valuemax={Math.floor(totalDuration)}
          />
          <span className={styles.time}>{formatDuration(totalDuration)}</span>
        </div>
      </div>

      <div className={styles.right}>
        {song?.bitRate ? <span className={styles.bitrate}>{song.bitRate} kbps</span> : null}
        <Tooltip label={isMuted ? 'Unmute' : 'Mute'}>
          <button
            className={styles.ctrl}
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            type="button"
          >
            {isMuted ? <MutedIcon size={18} /> : <VolumeIcon size={18} />}
          </button>
        </Tooltip>
        <div className={styles.volumeWrap}>
          <input
            type="range"
            className="pm-range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Volume"
            style={{ '--progress': `${volumePct}%` } as React.CSSProperties}
          />
        </div>
        <Tooltip label="Lyrics">
          <button
            className={`${styles.ctrl}${isLyricsOpen ? ' ' + styles.active : ''}`}
            onClick={toggleLyricsDrawer}
            aria-label="Toggle lyrics"
            aria-pressed={isLyricsOpen}
            type="button"
            disabled={!song}
          >
            <LyricsIcon size={18} />
          </button>
        </Tooltip>
        <Tooltip label="Queue">
          <button
            className={`${styles.ctrl}${isQueueOpen ? ' ' + styles.active : ''}`}
            onClick={toggleQueueDrawer}
            aria-label="Toggle queue"
            aria-pressed={isQueueOpen}
            type="button"
          >
            <QueueIcon size={18} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
