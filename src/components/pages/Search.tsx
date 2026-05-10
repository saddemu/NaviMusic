import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { search3 } from '@/lib/subsonic';
import { useAuthStore } from '@/store/authStore';
import { usePlayerStore } from '@/store/playerStore';
import { debounce } from '@/lib/utils';
import AlbumCard from '../ui/AlbumCard';
import ArtistCard from '../ui/ArtistCard';
import TrackRow from '../ui/TrackRow';
import PageHeader from '../ui/PageHeader';
import EmptyState from '../ui/EmptyState';
import { SearchIcon } from '../ui/Icon';
import styles from './Search.module.css';

const RECENT_KEY = 'pmusic.recent-searches';

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}
function pushRecent(q: string) {
  const cur = readRecent().filter((r) => r !== q);
  const next = [q, ...cur].slice(0, 10);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export default function Search() {
  const config = useAuthStore((s) => s.config);
  const playQueue = usePlayerStore((s) => s.playQueue);
  const [params, setParams] = useSearchParams();
  const initial = params.get('q') ?? '';
  const [input, setInput] = useState(initial);
  const [debouncedQ, setDebouncedQ] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);
  const [recent, setRecent] = useState<string[]>(readRecent);

  const update = useMemo(
    () =>
      debounce((q: string) => {
        setDebouncedQ(q);
        if (q.trim()) {
          params.set('q', q);
          setParams(params, { replace: true });
        } else {
          params.delete('q');
          setParams(params, { replace: true });
        }
      }, 300),
    [params, setParams],
  );

  useEffect(() => {
    update(input);
    return update.cancel;
  }, [input, update]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ['search', debouncedQ],
    queryFn: () => search3(config!, debouncedQ, 10, 10, 20),
    enabled: !!config && debouncedQ.trim().length > 0,
  });

  useEffect(() => {
    if (debouncedQ.trim().length > 1 && data) {
      pushRecent(debouncedQ);
      setRecent(readRecent());
    }
  }, [debouncedQ, data]);

  return (
    <div className={styles.page}>
      <PageHeader title="Search" />
      <div className={styles.searchBox}>
        <input
          ref={inputRef}
          className={styles.input}
          type="search"
          placeholder="Search songs, albums, artists..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Search"
        />
      </div>

      {!debouncedQ.trim() && recent.length > 0 && (
        <div className={styles.recent}>
          {recent.map((r) => (
            <button key={r} className={styles.chip} onClick={() => setInput(r)} type="button">
              {r}
            </button>
          ))}
        </div>
      )}

      {!debouncedQ.trim() && recent.length === 0 && (
        <EmptyState
          icon={<SearchIcon size={28} />}
          title="Find anything in your library"
          message="Search by song title, album name, or artist."
        />
      )}

      {debouncedQ.trim() && !isFetching && data && (
        <>
          {data.song?.length === 0 && data.album?.length === 0 && data.artist?.length === 0 && (
            <EmptyState title="No results" message={`Nothing matched "${debouncedQ}".`} />
          )}

          {data.song && data.song.length > 0 && (
            <section className={styles.section}>
              <h2>Songs</h2>
              <div className={styles.songList}>
                {data.song.slice(0, 8).map((s, i) => (
                  <TrackRow
                    key={s.id}
                    song={s}
                    showCover
                    showAlbum
                    onPlay={() => playQueue(data.song!, i)}
                  />
                ))}
              </div>
            </section>
          )}

          {data.album && data.album.length > 0 && (
            <section className={styles.section}>
              <h2>Albums</h2>
              <div className={styles.albumGrid}>
                {data.album.slice(0, 8).map((a) => (
                  <AlbumCard key={a.id} album={a} />
                ))}
              </div>
            </section>
          )}

          {data.artist && data.artist.length > 0 && (
            <section className={styles.section}>
              <h2>Artists</h2>
              <div className={styles.artistGrid}>
                {data.artist.slice(0, 8).map((a) => (
                  <ArtistCard key={a.id} artist={a} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
