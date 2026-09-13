import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { coverArtUrl, getPlaylist, updatePlaylist } from '@/lib/subsonic';
import { useAuthStore } from '@/store/authStore';
import { usePlayerStore } from '@/store/playerStore';
import { useUiStore } from '@/store/uiStore';
import { showToast } from '@/store/toastStore';
import { formatLongDuration } from '@/lib/utils';
import TrackRow from '../ui/TrackRow';
import EmptyState from '../ui/EmptyState';
import Skeleton from '../ui/Skeleton';
import { DragIcon, PlayIcon, ShuffleIcon } from '../ui/Icon';
import styles from './AlbumDetail.module.css';

export default function PlaylistDetail() {
  const { id } = useParams();
  const config = useAuthStore((s) => s.config);
  const playQueue = usePlayerStore((s) => s.playQueue);
  const playShuffled = usePlayerStore((s) => s.playShuffled);
  const setBackdropImageUrl = useUiStore((s) => s.setBackdropImageUrl);
  const queryClient = useQueryClient();
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const { data: playlist, isLoading } = useQuery({
    queryKey: ['playlist', id],
    queryFn: () => getPlaylist(config!, id!),
    enabled: !!config && !!id,
  });

  const songs = useMemo(() => playlist?.entry ?? [], [playlist]);

  useEffect(() => {
    if (config && playlist?.coverArt) {
      setBackdropImageUrl(coverArtUrl(config, playlist.coverArt, 600));
    }
    return () => setBackdropImageUrl(undefined);
  }, [config, playlist?.coverArt, setBackdropImageUrl]);

  const reorderMut = useMutation({
    mutationFn: async (next: typeof songs) => {
      if (!config || !id) return;
      // updatePlaylist on Navidrome supports overwriting song list via remove all + add all
      const indexes = (playlist?.entry ?? []).map((_, i) => i);
      await updatePlaylist(config, id, undefined, [], indexes);
      await updatePlaylist(
        config,
        id,
        undefined,
        next.map((s) => s.id),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist', id] });
      showToast('Order updated', 'success');
    },
    onError: () => showToast('Failed to reorder', 'error'),
  });

  const removeMut = useMutation({
    mutationFn: async (index: number) => {
      if (!config || !id) return;
      await updatePlaylist(config, id, undefined, [], [index]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist', id] });
      showToast('Track removed', 'success');
    },
    onError: () => showToast('Failed to remove track', 'error'),
  });

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.hero}>
          <Skeleton width={240} height={240} radius={12} />
        </div>
      </div>
    );
  }

  if (!playlist) return <EmptyState title="Playlist not found" />;

  const cover = config && playlist.coverArt ? coverArtUrl(config, playlist.coverArt, 600) : '';

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.cover}>{cover && <img src={cover} alt={playlist.name} />}</div>
        <div className={styles.heroInfo}>
          <span className={styles.eyebrow}>Playlist</span>
          <h1 className={styles.title}>{playlist.name}</h1>
          <div className={styles.metaLine}>
            <span>{playlist.songCount} tracks</span>
            <span className={styles.dot}>·</span>
            <span>{formatLongDuration(playlist.duration)}</span>
            {playlist.owner && (
              <>
                <span className={styles.dot}>·</span>
                <span>by {playlist.owner}</span>
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
          <div
            key={`${song.id}-${i}`}
            draggable
            onDragStart={() => setDragIdx(i)}
            onDragOver={(e) => {
              e.preventDefault();
              setOverIdx(i);
            }}
            onDrop={() => {
              if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
                const next = [...songs];
                const [m] = next.splice(dragIdx, 1);
                next.splice(overIdx, 0, m);
                reorderMut.mutate(next);
              }
              setDragIdx(null);
              setOverIdx(null);
            }}
            onDragEnd={() => {
              setDragIdx(null);
              setOverIdx(null);
            }}
            style={{
              display: 'grid',
              gridTemplateColumns: '20px 1fr',
              alignItems: 'center',
              gap: 4,
              opacity: dragIdx === i ? 0.5 : 1,
            }}
          >
            <span style={{ color: 'var(--text-tertiary)', cursor: 'grab' }} aria-hidden>
              <DragIcon size={14} />
            </span>
            <TrackRow
              song={song}
              index={i + 1}
              showCover
              onPlay={() => playQueue(songs, i)}
              extraMenu={[
                {
                  label: 'Remove from playlist',
                  onClick: () => removeMut.mutate(i),
                  danger: true,
                },
              ]}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
