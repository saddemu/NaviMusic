import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getGenres } from '@/lib/subsonic';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '../ui/PageHeader';
import Skeleton from '../ui/Skeleton';
import styles from './Genres.module.css';

export default function Genres() {
  const config = useAuthStore((s) => s.config);
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['genres'],
    queryFn: () => getGenres(config!),
    enabled: !!config,
  });

  const sorted = data?.slice().sort((a, b) => b.songCount - a.songCount) ?? [];

  return (
    <div className={styles.page}>
      <PageHeader title="Genres" subtitle={`${sorted.length} genres`} />
      <div className={styles.grid}>
        {isLoading
          ? Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} height={120} radius={12} />)
          : sorted.map((g) => (
              <button
                key={g.value}
                className={styles.card}
                onClick={() =>
                  navigate(`/albums?genre=${encodeURIComponent(g.value)}&sort=alphabeticalByName`)
                }
                type="button"
              >
                <div className={styles.name}>{g.value}</div>
                <div className={styles.meta}>
                  {g.songCount} songs · {g.albumCount} albums
                </div>
              </button>
            ))}
      </div>
    </div>
  );
}
