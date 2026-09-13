import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getAlbum, getAlbumList2, getAllSongs, getGenres, getSongsByGenre } from '@/lib/subsonic';
import { useAuthStore } from '@/store/authStore';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { usePlayerStore } from '@/store/playerStore';
import type { Song } from '@/types/subsonic';
import { PlayIcon, ShuffleIcon } from '../ui/Icon';
import TrackRow from '../ui/TrackRow';
import PageHeader from '../ui/PageHeader';
import styles from './Songs.module.css';

const ROW_HEIGHT = 56;
const OVERSCAN = 6;
const SONG_PAGE_SIZE = 500;
const GENRE_PAGE_SIZE = 500;
/** Only used by the fallback feed, which pays a request per album. */
const ALBUMS_PER_PAGE = 20;

type SortKey = 'title' | 'artist' | 'album' | 'duration';

interface SongsPage {
  songs: Song[];
  nextOffset: number | null;
}

export default function Songs() {
  const config = useAuthStore((s) => s.config);
  // A phone fits the title and the duration; artist, album and bitrate are
  // dropped from both the header and the rows rather than squeezed.
  const isMobile = useIsMobile();
  const playQueue = usePlayerStore((s) => s.playQueue);
  const playShuffled = usePlayerStore((s) => s.playShuffled);

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

  // Which feed this server can answer, decided once with a one-song probe and
  // then kept for the session. `search3` gives the whole library a page at a
  // time; walking the album list costs a request per album and is only worth
  // it on a server that will not answer the first form.
  const feedMode = useQuery({
    queryKey: ['songs-feed-mode'],
    queryFn: async (): Promise<'search' | 'albums'> => {
      const probe = await getAllSongs(config!, 1, 0);
      return probe.length > 0 ? 'search' : 'albums';
    },
    enabled: !!config,
    staleTime: Infinity,
  });

  // One request per 500 songs on the fast path. This used to walk the album
  // list and call getAlbum on every album unconditionally — a request per
  // album, thousands of them on a real library, fifty at a time on page open.
  const songsQuery = useInfiniteQuery({
    queryKey: ['songs-feed', genreFilter, feedMode.data],
    queryFn: async ({ pageParam }): Promise<SongsPage> => {
      if (!config) return { songs: [], nextOffset: null };

      if (genreFilter) {
        const songs = await getSongsByGenre(config, genreFilter, GENRE_PAGE_SIZE, pageParam);
        return {
          songs,
          nextOffset: songs.length < GENRE_PAGE_SIZE ? null : pageParam + GENRE_PAGE_SIZE,
        };
      }

      if (feedMode.data === 'albums') {
        const albums = await getAlbumList2(
          config,
          'alphabeticalByName',
          ALBUMS_PER_PAGE,
          pageParam,
        );
        const detailed = await Promise.all(albums.map((a) => getAlbum(config, a.id)));
        return {
          songs: detailed.flatMap((a) => a.song ?? []),
          nextOffset: albums.length < ALBUMS_PER_PAGE ? null : pageParam + ALBUMS_PER_PAGE,
        };
      }

      const songs = await getAllSongs(config, SONG_PAGE_SIZE, pageParam);
      return {
        songs,
        nextOffset: songs.length < SONG_PAGE_SIZE ? null : pageParam + SONG_PAGE_SIZE,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset,
    enabled: !!config && !!feedMode.data,
  });

  // The whole library still arrives eagerly — sorting and "play everything"
  // are only honest over the whole list — but sequentially, and now at a few
  // dozen requests rather than a few thousand.
  const { hasNextPage, isFetching, fetchNextPage } = songsQuery;
  useEffect(() => {
    if (hasNextPage && !isFetching) fetchNextPage();
  }, [hasNextPage, isFetching, fetchNextPage]);

  const allSongs = useMemo(
    () => songsQuery.data?.pages.flatMap((p) => p.songs) ?? [],
    [songsQuery.data],
  );

  const sorted = useMemo(() => {
    const dir = sortAsc ? 1 : -1;
    return [...allSongs].sort((a, b) => {
      const av = (a[sortKey as keyof Song] ?? '') as string | number;
      const bv = (b[sortKey as keyof Song] ?? '') as string | number;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [allSongs, sortKey, sortAsc]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => setScrollTop(el.scrollTop);
    el.addEventListener('scroll', onScroll, { passive: true });
    // The list mounts empty, so a single clientHeight read here returns 0 and
    // the window would stay stuck at OVERSCAN rows forever. Observe the box.
    const ro = new ResizeObserver(() => setViewportHeight(el.clientHeight));
    ro.observe(el);
    setViewportHeight(el.clientHeight);
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
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
    <div className={styles.page}>
      <PageHeader
        title="Songs"
        subtitle={hasNextPage ? `${sorted.length} songs…` : `${sorted.length} songs`}
        actions={
          <>
            <button
              className={styles.playBtn}
              onClick={() => playQueue(sorted, 0)}
              disabled={sorted.length === 0}
              type="button"
            >
              <PlayIcon size={16} /> Play
            </button>
            <button
              className={styles.shuffleBtn}
              onClick={() => playShuffled(sorted)}
              disabled={sorted.length === 0}
              type="button"
            >
              <ShuffleIcon size={16} /> Shuffle
            </button>
            <select
              className={styles.genreSelect}
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              aria-label="Filter by genre"
            >
              <option value="">All genres</option>
              {genres.data?.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.value}
                </option>
              ))}
            </select>
          </>
        }
      />
      <div className={styles.tableHead}>
        <span>#</span>
        <button onClick={() => setSort('title')} type="button">
          Title {sortKey === 'title' ? (sortAsc ? '↑' : '↓') : ''}
        </button>
        {!isMobile && (
          <>
            <button onClick={() => setSort('artist')} type="button">
              Artist {sortKey === 'artist' ? (sortAsc ? '↑' : '↓') : ''}
            </button>
            <button onClick={() => setSort('album')} type="button">
              Album {sortKey === 'album' ? (sortAsc ? '↑' : '↓') : ''}
            </button>
            <span>Bitrate</span>
          </>
        )}
        <button onClick={() => setSort('duration')} type="button" style={{ textAlign: 'right' }}>
          Time {sortKey === 'duration' ? (sortAsc ? '↑' : '↓') : ''}
        </button>
        <span></span>
        <span></span>
      </div>
      <div ref={containerRef} className={styles.virtual}>
        <div style={{ height: totalHeight, position: 'relative' }} className={styles.viewport}>
          <div style={{ position: 'absolute', top: startIndex * ROW_HEIGHT, left: 0, right: 0 }}>
            {visible.map((s, i) => (
              <TrackRow
                key={s.id + (startIndex + i)}
                song={s}
                index={startIndex + i + 1}
                showCover
                showArtist={!isMobile}
                showAlbum={!isMobile}
                showBitrate={!isMobile}
                onPlay={() => playQueue(sorted, startIndex + i)}
              />
            ))}
          </div>
        </div>
        <div className={styles.listSpacer} />
      </div>
    </div>
  );
}
