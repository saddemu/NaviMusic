import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import { coverArtUrl, getAlbum, getArtist, getArtistInfo2, getTopSongs } from '@/lib/subsonic';
import { useAuthStore } from '@/store/authStore';
import { usePlayerStore } from '@/store/playerStore';
import { useUiStore } from '@/store/uiStore';
import { showToast } from '@/store/toastStore';
import AlbumCard from '../ui/AlbumCard';
import TrackRow from '../ui/TrackRow';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import { ShuffleIcon } from '../ui/Icon';
import styles from './ArtistDetail.module.css';

export default function ArtistDetail() {
  const { id } = useParams();
  const config = useAuthStore((s) => s.config);
  const queryClient = useQueryClient();
  const playQueue = usePlayerStore((s) => s.playQueue);
  const playShuffled = usePlayerStore((s) => s.playShuffled);
  const setBackdropImageUrl = useUiStore((s) => s.setBackdropImageUrl);
  const [bioOpen, setBioOpen] = useState(false);

  const artist = useQuery({
    queryKey: ['artist', id],
    queryFn: () => getArtist(config!, id!),
    enabled: !!config && !!id,
  });

  const info = useQuery({
    queryKey: ['artistInfo', id],
    queryFn: () => getArtistInfo2(config!, id!),
    enabled: !!config && !!id,
  });

  const topSongs = useQuery({
    queryKey: ['topSongs', artist.data?.name],
    queryFn: () => getTopSongs(config!, artist.data!.name, 10),
    enabled: !!config && !!artist.data?.name,
  });

  useEffect(() => {
    const url = info.data?.largeImageUrl
      ? info.data.largeImageUrl
      : config && artist.data?.coverArt
      ? coverArtUrl(config, artist.data.coverArt, 800)
      : undefined;
    setBackdropImageUrl(url);
    return () => setBackdropImageUrl(undefined);
  }, [config, artist.data?.coverArt, info.data?.largeImageUrl, setBackdropImageUrl]);

  const shuffleMut = useMutation({
    mutationFn: async () => {
      if (!config || !artist.data) throw new Error('Missing artist');
      const albums = artist.data.album ?? [];
      const fullAlbums = await Promise.all(
        albums.map((a) =>
          queryClient.fetchQuery({
            queryKey: ['album', a.id],
            queryFn: () => getAlbum(config, a.id),
          }),
        ),
      );
      return fullAlbums.flatMap((a) => a.song ?? []);
    },
    onSuccess: (songs) => {
      if (songs.length === 0) {
        showToast('No songs found for this artist', 'error');
        return;
      }
      playShuffled(songs);
    },
    onError: () => showToast('Could not load songs for this artist', 'error'),
  });

  if (artist.isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.hero}>
          <Skeleton height={14} width={80} />
          <div style={{ height: 12 }} />
          <Skeleton height={72} width="50%" />
        </div>
      </div>
    );
  }

  if (!artist.data) {
    return <EmptyState title="Artist not found" />;
  }

  const albums = (artist.data.album ?? []).slice().sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

  const cleanBio = info.data?.biography
    ? DOMPurify.sanitize(info.data.biography, { ALLOWED_TAGS: ['a', 'em', 'strong', 'br'] })
    : '';

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.eyebrow}>Artist</span>
        <h1 className={styles.title}>{artist.data.name}</h1>
        {cleanBio && (
          <div>
            <div
              className={`${styles.bio}${bioOpen ? ' ' + styles.expanded : ''}`}
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: cleanBio }}
            />
            <button
              type="button"
              className={styles.bioToggle}
              onClick={() => setBioOpen((v) => !v)}
            >
              {bioOpen ? 'Show less' : 'Read more'}
            </button>
          </div>
        )}
        {info.data?.similarArtist && info.data.similarArtist.length > 0 && (
          <div className={styles.similar}>
            {info.data.similarArtist.slice(0, 8).map((a) => (
              <Link key={a.id} to={`/artist/${a.id}`} className={styles.chip}>
                {a.name}
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.shuffleBtn}
          onClick={() => shuffleMut.mutate()}
          disabled={!artist.data.album?.length || shuffleMut.isPending}
        >
          <ShuffleIcon size={16} />
          {shuffleMut.isPending ? 'Loading…' : 'Shuffle'}
        </button>
      </div>

      {topSongs.data && topSongs.data.length > 0 && (
        <section className={styles.section}>
          <h2>Top Songs</h2>
          {topSongs.data.map((s, i) => (
            <TrackRow
              key={s.id}
              song={s}
              index={i + 1}
              showCover
              onPlay={() => playQueue(topSongs.data!, i)}
            />
          ))}
        </section>
      )}

      <section className={styles.section}>
        <h2>Albums</h2>
        <div className={styles.albumGrid}>
          {albums.map((a) => (
            <AlbumCard key={a.id} album={a} subtitle="year" />
          ))}
        </div>
      </section>
    </div>
  );
}
