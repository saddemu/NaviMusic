import { useEffect, useMemo, useRef } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getAlbumList2, getGenres } from '@/lib/subsonic';
import { useAuthStore } from '@/store/authStore';
import AlbumCard from '../ui/AlbumCard';
import PageHeader from '../ui/PageHeader';
import Skeleton from '../ui/Skeleton';
import { useSearchParams } from 'react-router-dom';
import styles from './Albums.module.css';

const PAGE_SIZE = 48;

const TABS = [
  { value: 'newest', label: 'Recently Added' },
  { value: 'recent', label: 'Recently Played' },
  { value: 'frequent', label: 'Most Played' },
  { value: 'alphabeticalByName', label: 'Name' },
  { value: 'alphabeticalByArtist', label: 'Artist' },
  { value: 'byYear', label: 'By Year' },
  { value: 'random', label: 'Random' },
] as const;

type SortValue = (typeof TABS)[number]['value'];

export default function Albums() {
  const config = useAuthStore((s) => s.config);
  const [params, setParams] = useSearchParams();
  const sort = (params.get('sort') ?? 'newest') as SortValue;
  const genre = params.get('genre') ?? '';
  const sentinelRef = useRef<HTMLDivElement>(null);

  const genres = useQuery({
    queryKey: ['genres'],
    queryFn: () => getGenres(config!),
    enabled: !!config,
  });

  const albums = useInfiniteQuery({
    queryKey: ['albums', sort, genre],
    queryFn: ({ pageParam = 0 }) =>
      getAlbumList2(
        config!,
        sort === 'byYear' ? 'byYear' : sort,
        PAGE_SIZE,
        pageParam,
        sort === 'byYear' ? 1900 : undefined,
        sort === 'byYear' ? new Date().getFullYear() : undefined,
        genre || undefined,
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, all) =>
      lastPage.length < PAGE_SIZE ? undefined : all.length * PAGE_SIZE,
    enabled: !!config,
  });

  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && albums.hasNextPage && !albums.isFetchingNextPage) {
          albums.fetchNextPage();
        }
      },
      { rootMargin: '300px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [albums]);

  const all = useMemo(() => albums.data?.pages.flat() ?? [], [albums.data]);

  const setSort = (next: SortValue) => {
    params.set('sort', next);
    setParams(params, { replace: true });
  };

  return (
    <div className={styles.page}>
      <PageHeader title="Albums" subtitle={`${all.length} loaded`} />

      <div className={styles.tabs} role="tablist">
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={sort === t.value}
            className={`${styles.tab}${sort === t.value ? ' ' + styles.active : ''}`}
            onClick={() => setSort(t.value)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.controls}>
        <select
          className={styles.select}
          value={genre}
          onChange={(e) => {
            if (e.target.value) params.set('genre', e.target.value);
            else params.delete('genre');
            setParams(params, { replace: true });
          }}
          aria-label="Filter by genre"
        >
          <option value="">All genres</option>
          {genres.data?.map((g) => (
            <option key={g.value} value={g.value}>
              {g.value}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.grid}>
        {albums.isLoading
          ? Array.from({ length: 12 }).map((_, i) => (
              <div key={i}>
                <Skeleton height={170} radius={12} />
                <div style={{ height: 8 }} />
                <Skeleton height={12} width="80%" />
              </div>
            ))
          : all.map((a) => <AlbumCard key={a.id} album={a} />)}
      </div>
      <div ref={sentinelRef} className={styles.sentinel} />
      {albums.isFetchingNextPage && <div className={styles.loading}>Loading more…</div>}
    </div>
  );
}
