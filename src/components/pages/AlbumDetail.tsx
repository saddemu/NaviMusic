import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { coverArtUrl, getAlbum } from '@/lib/subsonic';
import { useAuthStore } from '@/store/authStore';
import { usePlayerStore } from '@/store/playerStore';
import { useUiStore } from '@/store/uiStore';
import { useStarMutation } from '@/hooks/useStarMutation';
import { formatLongDuration } from '@/lib/utils';
import { HeartIcon, PlayIcon, ShuffleIcon } from '../ui/Icon';
import TrackRow from '../ui/TrackRow';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import styles from './AlbumDetail.module.css';

export default function AlbumDetail() {
  const { id } = useParams();
  const config = useAuthStore((s) => s.config);
  const playQueue = usePlayerStore((s) => s.playQueue);
  const playShuffled = usePlayerStore((s) => s.playShuffled);
  const setBackdropImageUrl = useUiStore((s) => s.setBackdropImageUrl);
  const starMut = useStarMutation();

  const { data: album, isLoading } = useQuery({
    queryKey: ['album', id],
    queryFn: () => getAlbum(config!, id!),
    enabled: !!config && !!id,
  });

  const songs = useMemo(() => album?.song ?? [], [album]);

  useEffect(() => {
    if (config && album?.coverArt) {
      setBackdropImageUrl(coverArtUrl(config, album.coverArt, 600));
    }
    return () => setBackdropImageUrl(undefined);
  }, [config, album?.coverArt, setBackdropImageUrl]);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.hero}>
          <Skeleton width={240} height={240} radius={12} />
          <div style={{ flex: 1 }}>
            <Skeleton height={14} width={80} />
            <div style={{ height: 12 }} />
            <Skeleton height={56} width="60%" />
            <div style={{ height: 16 }} />
            <Skeleton height={14} width="40%" />
          </div>
        </div>
      </div>
    );
  }

  if (!album) {
    return (
      <EmptyState title="Album not found" message="It may have been removed from the library." />
    );
  }

  const cover = config ? coverArtUrl(config, album.coverArt, 600) : '';
  const isStarred = !!album.starred;
  const avgBitrate = songs.length
    ? Math.round(
        songs.filter((s) => s.bitRate).reduce((acc, s) => acc + (s.bitRate ?? 0), 0) /
          songs.filter((s) => s.bitRate).length,
      )
    : 0;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.cover}>{cover && <img src={cover} alt={album.name} />}</div>
        <div className={styles.heroInfo}>
          <span className={styles.eyebrow}>Album</span>
          <h1 className={styles.title}>{album.name}</h1>
          <div className={styles.metaLine}>
            {album.artistId ? (
              <Link to={`/artist/${album.artistId}`}>
                <strong>{album.artist}</strong>
              </Link>
            ) : (
              <strong>{album.artist}</strong>
            )}
            {album.year && (
              <>
                <span className={styles.dot}>·</span>
                <span>{album.year}</span>
              </>
            )}
            {album.genre && (
              <>
                <span className={styles.dot}>·</span>
                <span>{album.genre}</span>
              </>
            )}
            <span className={styles.dot}>·</span>
            <span>
              {album.songCount} tracks{album.duration && `, ${formatLongDuration(album.duration)}`}
            </span>
            {avgBitrate > 0 && (
              <>
                <span className={styles.dot}>·</span>
                <span>~{avgBitrate} kbps avg</span>
              </>
            )}
          </div>
        </div>
      </section>

      <div className={styles.actions}>
        <button
          className={styles.playBtn}
          onClick={() => playQueue(songs, 0)}
          disabled={songs.length === 0}
          type="button"
        >
          <PlayIcon size={16} /> Play
        </button>
        <button
          className={styles.shuffleBtn}
          onClick={() => playShuffled(songs)}
          disabled={songs.length === 0}
          type="button"
        >
          <ShuffleIcon size={16} /> Shuffle
        </button>
        <button
          className={`${styles.starBtn}${isStarred ? ' ' + styles.active : ''}`}
          onClick={() => starMut.mutate({ albumId: album.id, starred: isStarred })}
          aria-label={isStarred ? 'Unstar album' : 'Star album'}
          type="button"
        >
          <HeartIcon size={18} filled={isStarred} />
        </button>
      </div>

      <div className={styles.tracks}>
        <div className={styles.tracksHeader}>
          <span>#</span>
          <span>Title</span>
          <span style={{ textAlign: 'right' }}>Time</span>
          <span></span>
          <span></span>
        </div>
        {songs.map((song, i) => (
          <TrackRow key={song.id} song={song} index={i + 1} onPlay={() => playQueue(songs, i)} />
        ))}
      </div>
    </div>
  );
}
