import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getAlbumList2, getAlbum, getGenres, getSongsByGenre } from '@/lib/subsonic';
import { useAuthStore } from '@/store/authStore';
import { usePlayerStore } from '@/store/playerStore';
import type { Song } from '@/types/subsonic';
import TrackRow from '../ui/TrackRow';
import PageHeader from '../ui/PageHeader';
import styles from './Songs.module.css';

const ROW_HEIGHT = 56;
const OVERSCAN = 6;
const PAGE_SIZE = 100;

type SortKey = 'title' | 'artist' | 'album' | 'duration';

export default function Songs() {
  const config = useAuthStore((s) => s.config);
  const playQueue = usePlayerStore((s) => s.playQueue);

  const [sortKey, setSortKey] = useState<SortKey>('title');
  const [sortAsc, setSortAsc] = useState(true);
  const [genreFilter, setGenreFilter] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(800);

  const genres = useQuery({
    queryKey: ['genres'],
    queryFn: () => getGenres(config!),
    enabled: !!config,
  });

  // Bulk fetch songs by paginating through random albums or by genre.
  const songsQuery = useInfiniteQuery({
    queryKey: ['songs-feed', genreFilter],
    queryFn: async ({ pageParam = 0 }): Promise<Song[]> => {
      if (!config) return [];
      if (genreFilter) {
        return getSongsByGenre(config, genreFilter, PAGE_SIZE, pageParam);
      }
      const albums = await getAlbumList2(
        config,
        'alphabeticalByName',
        20,
        Math.floor(pageParam / 20),
      );
      const detailed = await Promise.all(albums.map((a) => getAlbum(config, a.id)));
      return detailed.flatMap((a) => a.song ?? []);
    },
    initialPageParam: 0,
    getNextPageParam: (last, all) =>
      last.length === 0 ? undefined : (genreFilter ? all.length * PAGE_SIZE : all.length * 20),
    enabled: !!config,
  });

  const allSongs = useMemo(() => songsQuery.data?.pages.flat() ?? [], [songsQuery.data]);

  const sorted = useMemo(() => {
    const dir = sortAsc ? 1 : -1;
    return [...allSongs].sort((a, b) => {
      const av = (a[sortKey as keyof Song] ?? '') as string | number;
      const bv = (b[sortKey as keyof Song] ?? '') as string | number;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [allSongs, sortKey, sortAsc]);

  // Auto-fetch more if not enough rows for viewport
  useEffect(() => {
    if (
      !songsQuery.isFetching &&
      songsQuery.hasNextPage &&
      sorted.length * ROW_HEIGHT < viewportHeight + scrollTop + 600
    ) {
      songsQuery.fetchNextPage();
    }
  }, [songsQuery, sorted.length, scrollTop, viewportHeight]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => setScrollTop(el.scrollTop);
    const onResize = () => setViewportHeight(el.clientHeight);
    setViewportHeight(el.clientHeight);
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    sorted.length,
    Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN,
  );
  const totalHeight = sorted.length * ROW_HEIGHT;
  const visible = sorted.slice(startIndex, endIndex);

  const setSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  return (
    <div className={styles.page} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader title="Songs" subtitle={`${sorted.length} loaded`} actions={
        <select
          value={genreFilter}
          onChange={(e) => setGenreFilter(e.target.value)}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            color: 'var(--text-primary)',
          }}
        >
          <option value="">All genres</option>
          {genres.data?.map((g) => (
            <option key={g.value} value={g.value}>
              {g.value}
            </option>
          ))}
        </select>
      } />
      <div className={styles.tableHead}>
        <span>#</span>
        <button onClick={() => setSort('title')} type="button">
          Title {sortKey === 'title' ? (sortAsc ? '↑' : '↓') : ''}
        </button>
        <button onClick={() => setSort('artist')} type="button">
          Artist {sortKey === 'artist' ? (sortAsc ? '↑' : '↓') : ''}
        </button>
        <button onClick={() => setSort('album')} type="button">
          Album {sortKey === 'album' ? (sortAsc ? '↑' : '↓') : ''}
        </button>
        <span>Bitrate</span>
        <button onClick={() => setSort('duration')} type="button" style={{ textAlign: 'right' }}>
          Time {sortKey === 'duration' ? (sortAsc ? '↑' : '↓') : ''}
        </button>
        <span></span>
        <span></span>
      </div>
      <div
        ref={containerRef}
        className={styles.virtual}
        style={{ flex: 1, overflowY: 'auto' }}
      >
        <div style={{ height: totalHeight, position: 'relative' }} className={styles.viewport}>
          <div
            style={{ position: 'absolute', top: startIndex * ROW_HEIGHT, left: 0, right: 0 }}
          >
            {visible.map((s, i) => (
              <TrackRow
                key={s.id + (startIndex + i)}
                song={s}
                index={startIndex + i + 1}
                showCover
                showArtist
                showAlbum
                showBitrate
                onPlay={() => playQueue(sorted, startIndex + i)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
