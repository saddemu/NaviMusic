import { memo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { Song } from '@/types/subsonic';
import { coverArtUrl } from '@/lib/subsonic';
import { useAuthStore } from '@/store/authStore';
import { usePlayerStore } from '@/store/playerStore';
import { useStarMutation } from '@/hooks/useStarMutation';
import { formatDuration } from '@/lib/utils';
import { HeartIcon, MoreIcon } from './Icon';
import ContextMenu, { type MenuItem } from './ContextMenu';
import styles from './TrackRow.module.css';

interface TrackRowProps {
  song: Song;
  index?: number;
  showCover?: boolean;
  showAlbum?: boolean;
  showArtist?: boolean;
  showBitrate?: boolean;
  onPlay: () => void;
  extraMenu?: MenuItem[];
}

function TrackRowInner({
  song,
  index,
  showCover = false,
  showAlbum = false,
  showArtist = false,
  showBitrate = false,
  onPlay,
  extraMenu,
}: TrackRowProps) {
  const config = useAuthStore((s) => s.config);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const addNext = usePlayerStore((s) => s.addNext);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const star = useStarMutation();
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  const isCurrent = currentSong?.id === song.id;
  const isStarred = !!song.starred;

  // Build column template — only include columns we actually render
  const cols: string[] = [];
  if (index !== undefined) cols.push('36px');
  cols.push('1fr');
  if (showArtist) cols.push('minmax(120px, 1fr)');
  if (showAlbum) cols.push('minmax(120px, 1fr)');
  if (showBitrate) cols.push('80px');
  cols.push('60px'); // duration
  cols.push('32px'); // heart
  cols.push('32px'); // more
  const style = { '--cols': cols.join(' ') } as CSSProperties;

  const cover = config && showCover ? coverArtUrl(config, song.coverArt, 80) : '';

  const menuItems: MenuItem[] = [
    { label: 'Play next', onClick: () => addNext(song) },
    { label: 'Add to queue', onClick: () => addToQueue(song) },
    {
      label: isStarred ? 'Remove from starred' : 'Add to starred',
      onClick: () => star.mutate({ id: song.id, starred: isStarred }),
    },
    ...(extraMenu ?? []),
  ];

  return (
    <>
      <div
        className={`${styles.row}${isCurrent ? ' ' + styles.current : ''}`}
        style={style}
        onClick={onPlay}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenuPos({ x: e.clientX, y: e.clientY });
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' ? onPlay() : null)}
      >
        {index !== undefined && (
          <div className={styles.num}>
            <span>{index}</span>
          </div>
        )}
        <div className={styles.titleWrap}>
          {showCover && (
            <div className={styles.cover}>
              {cover && <img src={cover} alt="" loading="lazy" />}
            </div>
          )}
          <div className={styles.titleCol}>
            <div className={styles.title}>{song.title}</div>
            {(showArtist === false || showCover) && song.artist && (
              <div className={styles.subtitle}>{song.artist}</div>
            )}
          </div>
        </div>
        {showArtist && (
          <div className={styles.cell}>
            {song.artistId ? (
              <Link
                to={`/artist/${song.artistId}`}
                onClick={(e) => e.stopPropagation()}
              >
                {song.artist}
              </Link>
            ) : (
              song.artist
            )}
          </div>
        )}
        {showAlbum && (
          <div className={styles.cell}>
            {song.albumId ? (
              <Link to={`/album/${song.albumId}`} onClick={(e) => e.stopPropagation()}>
                {song.album}
              </Link>
            ) : (
              song.album
            )}
          </div>
        )}
        {showBitrate && (
          <div className={styles.cell}>{song.bitRate ? `${song.bitRate}` : '—'}</div>
        )}
        <div className={`${styles.cell} ${styles.duration}`}>{formatDuration(song.duration)}</div>
        <button
          className={`${styles.heart}${isStarred ? ' ' + styles.active : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            star.mutate({ id: song.id, starred: isStarred });
          }}
          aria-label={isStarred ? 'Unstar' : 'Star'}
          type="button"
        >
          <HeartIcon size={14} filled={isStarred} />
        </button>
        <button
          className={styles.more}
          onClick={(e) => {
            e.stopPropagation();
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setMenuPos({ x: r.right, y: r.bottom });
          }}
          aria-label="More options"
          type="button"
        >
          <MoreIcon size={16} />
        </button>
      </div>
      {menuPos && (
        <ContextMenu items={menuItems} position={menuPos} onClose={() => setMenuPos(null)} />
      )}
    </>
  );
}

export default memo(TrackRowInner);
