import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { coverArtUrl, getAlbum, getAlbumList2, getRandomSongs } from '@/lib/subsonic';
import { useAuthStore } from '@/store/authStore';
import { usePlayerStore } from '@/store/playerStore';
import { greeting } from '@/lib/utils';
import { useDragScroll } from '@/hooks/useDragScroll';
import AlbumCard from '../ui/AlbumCard';
import PageHeader from '../ui/PageHeader';
import Skeleton from '../ui/Skeleton';
import { MoreIcon, PlayIcon } from '../ui/Icon';
import type { Album, Song } from '@/types/subsonic';
import styles from './Home.module.css';

function CardSkeleton() {
  return (
    <div>
      <Skeleton height={170} radius={12} />
      <div style={{ height: 8 }} />
      <Skeleton height={12} width="80%" />
      <div style={{ height: 4 }} />
      <Skeleton height={10} width="60%" />
    </div>
  );
}

const FEATURED_LABELS = ['New release', 'Recently added', 'Discover'];

function FeaturedCard({ album, eyebrow }: { album: Album; eyebrow: string }) {
  const config = useAuthStore((s) => s.config);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const playQueue = usePlayerStore((s) => s.playQueue);

  const cover = config ? coverArtUrl(config, album.coverArt, 800) : '';

  const onPlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!config) return;
    const full = await queryClient.fetchQuery({
      queryKey: ['album', album.id],
      queryFn: () => getAlbum(config, album.id),
    });
    if (full.song && full.song.length > 0) playQueue(full.song, 0);
  };

  return (
    <button
      className={styles.heroCard}
      onClick={() => navigate(`/album/${album.id}`)}
      type="button"
    >
      <span className={styles.heroEyebrow}>{eyebrow}</span>
      <h3 className={styles.heroTitle}>{album.name}</h3>
      <span className={styles.heroSub}>{album.artist}</span>
      <div className={styles.heroImg}>
        {cover && <img src={cover} alt={album.name} loading="lazy" decoding="async" />}
        <button className={styles.heroPlay} onClick={onPlay} aria-label="Play" type="button">
          <PlayIcon size={20} />
        </button>
      </div>
    </button>
  );
}

function SongCell({ song, queue, index }: { song: Song; queue: Song[]; index: number }) {
  const config = useAuthStore((s) => s.config);
  const playQueue = usePlayerStore((s) => s.playQueue);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const cover = config ? coverArtUrl(config, song.coverArt, 100) : '';
  const isCurrent = currentSong?.id === song.id;

  return (
    <div
      className={`${styles.songCell}${isCurrent ? ' ' + styles.current : ''}`}
      onClick={() => playQueue(queue, index)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && playQueue(queue, index)}
    >
      <div className={styles.songCover}>{cover && <img src={cover} alt="" loading="lazy" />}</div>
      <div className={styles.songText}>
        <div className={styles.songTitle}>{song.title}</div>
        <div className={styles.songArtist}>{song.artist}</div>
      </div>
      <button className={styles.songMore} aria-label="More" type="button">
        <MoreIcon size={16} />
      </button>
    </div>
  );
}

export default function Home() {
  const config = useAuthStore((s) => s.config);
  const user = useAuthStore((s) => s.user);
  const newestRow = useDragScroll<HTMLDivElement>();
  const recentRow = useDragScroll<HTMLDivElement>();
  const discoverRow = useDragScroll<HTMLDivElement>();

  const newest = useQuery({
    queryKey: ['albumList', 'newest', 24],
    queryFn: () => getAlbumList2(config!, 'newest', 24),
    enabled: !!config,
  });
  const recent = useQuery({
    queryKey: ['albumList', 'recent', 20],
    queryFn: () => getAlbumList2(config!, 'recent', 20),
    enabled: !!config,
  });
  const random = useQuery({
    queryKey: ['albumList', 'random', 12],
    queryFn: () => getAlbumList2(config!, 'random', 12),
    enabled: !!config,
  });
  const songs = useQuery({
    queryKey: ['randomSongs', 16],
    queryFn: () => getRandomSongs(config!, 16),
    enabled: !!config,
  });

  const featured = useMemo(() => {
    const newestFirst = newest.data?.[0];
    const recentlyAdded = newest.data?.[1];
    const random0 = random.data?.[0];
    return [newestFirst, recentlyAdded, random0].filter(Boolean) as Album[];
  }, [newest.data, random.data]);

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow={new Date().toLocaleDateString(undefined, { weekday: 'long' })}
        title={`${greeting()}${user?.username ? `, ${user.username}` : ''}`}
        subtitle="Welcome back to your library."
      />

      {/* Featured hero cards */}
      <div className={styles.heroRow}>
        {featured.length === 0 &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <Skeleton height={14} width={100} />
              <div style={{ height: 8 }} />
              <Skeleton height={22} width="70%" />
              <div style={{ height: 8 }} />
              <Skeleton height={220} radius={18} />
            </div>
          ))}
        {featured.map((a, i) => (
          <FeaturedCard key={a.id} album={a} eyebrow={FEATURED_LABELS[i]} />
        ))}
      </div>

      {/* 4-col songs grid */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Top picks</h2>
          <Link to="/songs">See all</Link>
        </div>
        <div className={styles.songsGrid}>
          {songs.isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ padding: 8 }}>
                  <Skeleton height={44} radius={4} />
                </div>
              ))
            : songs.data?.map((s, i) => (
                <SongCell key={s.id} song={s} queue={songs.data!} index={i} />
              ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Recently Added</h2>
          <Link to="/albums?sort=newest">See all</Link>
        </div>
        <div className={styles.scroll} ref={newestRow}>
          {newest.isLoading
            ? Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)
            : newest.data?.map((a) => <AlbumCard key={a.id} album={a} />)}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Recently Played</h2>
          <Link to="/albums?sort=recent">See all</Link>
        </div>
        <div className={styles.scroll} ref={recentRow}>
          {recent.isLoading
            ? Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)
            : recent.data?.map((a) => <AlbumCard key={a.id} album={a} />)}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Discover</h2>
        </div>
        <div className={styles.scroll} ref={discoverRow}>
          {random.isLoading
            ? Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)
            : random.data?.map((a) => <AlbumCard key={a.id} album={a} />)}
        </div>
      </section>
    </div>
  );
}
