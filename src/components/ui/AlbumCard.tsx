import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { coverArtUrl, getAlbum } from '@/lib/subsonic';
import { useAuthStore } from '@/store/authStore';
import { isNarrowViewport } from '@/lib/utils';
import { usePlayerStore } from '@/store/playerStore';
import type { Album } from '@/types/subsonic';
import { PlayIcon } from './Icon';
import styles from './AlbumCard.module.css';

interface AlbumCardProps {
  album: Album;
  subtitle?: 'artist' | 'year' | 'none';
}

function AlbumCardInner({ album, subtitle = 'artist' }: AlbumCardProps) {
  const config = useAuthStore((s) => s.config);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const playQueue = usePlayerStore((s) => s.playQueue);

  // Cells are ~190px on a desktop grid and ~130px in the phone's; both ask
  // for roughly 2x so the artwork still looks right on a dense screen.
  const cover = config ? coverArtUrl(config, album.coverArt, isNarrowViewport() ? 240 : 360) : '';

  const onClick = () => navigate(`/album/${album.id}`);

  const onMouseEnter = () => {
    if (!config) return;
    queryClient.prefetchQuery({
      queryKey: ['album', album.id],
      queryFn: () => getAlbum(config, album.id),
    });
  };

  const onPlayClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!config) return;
    const full = await queryClient.fetchQuery({
      queryKey: ['album', album.id],
      queryFn: () => getAlbum(config, album.id),
    });
    if (full.song && full.song.length > 0) playQueue(full.song, 0);
  };

  const sub =
    subtitle === 'artist' ? album.artist : subtitle === 'year' ? album.year?.toString() : '';

  return (
    <button
      className={styles.card}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      type="button"
      aria-label={`Open album ${album.name}`}
    >
      <div className={styles.cover}>
        {cover && (
          <img
            src={cover}
            alt={album.name}
            loading="lazy"
            decoding="async"
            width={360}
            height={360}
          />
        )}
        <span
          className={styles.playOverlay}
          onClick={onPlayClick}
          role="button"
          aria-label="Play album"
          tabIndex={-1}
        >
          <PlayIcon size={18} />
        </span>
      </div>
      <div className={styles.title} title={album.name}>
        {album.name}
      </div>
      {sub && (
        <div className={styles.subtitle} title={sub}>
          {sub}
        </div>
      )}
    </button>
  );
}

export default memo(AlbumCardInner);
