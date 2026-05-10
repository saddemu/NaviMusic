import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStarred2 } from '@/lib/subsonic';
import { useAuthStore } from '@/store/authStore';
import { usePlayerStore } from '@/store/playerStore';
import AlbumCard from '../ui/AlbumCard';
import ArtistCard from '../ui/ArtistCard';
import TrackRow from '../ui/TrackRow';
import PageHeader from '../ui/PageHeader';
import EmptyState from '../ui/EmptyState';
import { HeartIcon } from '../ui/Icon';
import styles from './Starred.module.css';

type Tab = 'songs' | 'albums' | 'artists';

export default function Starred() {
  const config = useAuthStore((s) => s.config);
  const playQueue = usePlayerStore((s) => s.playQueue);
  const [tab, setTab] = useState<Tab>('songs');

  const { data, isLoading } = useQuery({
    queryKey: ['starred'],
    queryFn: () => getStarred2(config!),
    enabled: !!config,
  });

  const total = (data?.song.length ?? 0) + (data?.album.length ?? 0) + (data?.artist.length ?? 0);

  return (
    <div className={styles.page}>
      <PageHeader title="Starred" subtitle={`${total} starred items`} />
      <div className={styles.tabs}>
        {(['songs', 'albums', 'artists'] as const).map((k) => (
          <button
            key={k}
            className={`${styles.tab}${tab === k ? ' ' + styles.active : ''}`}
            onClick={() => setTab(k)}
            type="button"
          >
            {k.charAt(0).toUpperCase() + k.slice(1)} (
            {k === 'songs'
              ? data?.song.length ?? 0
              : k === 'albums'
              ? data?.album.length ?? 0
              : data?.artist.length ?? 0}
            )
          </button>
        ))}
      </div>

      <div className={styles.body}>
        {!isLoading && total === 0 && (
          <EmptyState
            icon={<HeartIcon size={28} />}
            title="Nothing starred yet"
            message="Tap the heart on any song, album, or artist to save it here."
          />
        )}

        {tab === 'songs' &&
          data?.song.map((s, i) => (
            <TrackRow
              key={s.id}
              song={s}
              index={i + 1}
              showCover
              showAlbum
              onPlay={() => playQueue(data.song, i)}
            />
          ))}

        {tab === 'albums' && (
          <div className={styles.albumGrid}>
            {data?.album.map((a) => (
              <AlbumCard key={a.id} album={a} />
            ))}
          </div>
        )}

        {tab === 'artists' && (
          <div className={styles.artistGrid}>
            {data?.artist.map((a) => (
              <ArtistCard key={a.id} artist={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
