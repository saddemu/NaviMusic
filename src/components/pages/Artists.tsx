import { useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getArtists } from '@/lib/subsonic';
import { useAuthStore } from '@/store/authStore';
import ArtistCard from '../ui/ArtistCard';
import PageHeader from '../ui/PageHeader';
import Skeleton from '../ui/Skeleton';
import type { Artist } from '@/types/subsonic';
import styles from './Artists.module.css';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');

function letterOf(name: string): string {
  const ch = name.trim()[0]?.toUpperCase() ?? '#';
  return /[A-Z]/.test(ch) ? ch : '#';
}

export default function Artists() {
  const config = useAuthStore((s) => s.config);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  const { data, isLoading } = useQuery({
    queryKey: ['artists'],
    queryFn: () => getArtists(config!),
    enabled: !!config,
  });

  const grouped = useMemo(() => {
    const map = new Map<string, Artist[]>();
    for (const a of data ?? []) {
      const key = letterOf(a.name);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  const present = new Set(grouped.map(([k]) => k));

  return (
    <div className={styles.page}>
      <PageHeader title="Artists" subtitle={`${data?.length ?? 0} artists`} />
      <div className={styles.layout} ref={containerRef}>
        <div>
          {isLoading && (
            <div className={styles.grid}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{ padding: 16 }}>
                  <Skeleton height={140} radius={9999} />
                  <div style={{ height: 10 }} />
                  <Skeleton height={12} width="60%" />
                </div>
              ))}
            </div>
          )}
          {grouped.map(([letter, artists]) => (
            <section
              key={letter}
              className={styles.section}
              ref={(el) => {
                if (el) sectionRefs.current.set(letter, el);
                else sectionRefs.current.delete(letter);
              }}
            >
              <div className={styles.sectionLabel}>{letter}</div>
              <div className={styles.grid}>
                {artists.map((a) => (
                  <ArtistCard key={a.id} artist={a} />
                ))}
              </div>
            </section>
          ))}
        </div>
        <nav className={styles.alphaBar} aria-label="Jump to letter">
          {ALPHABET.map((ch) => (
            <button
              key={ch}
              className={!present.has(ch) ? styles.disabled : ''}
              onClick={() =>
                sectionRefs.current.get(ch)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              type="button"
            >
              {ch}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
