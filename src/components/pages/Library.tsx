import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPlaylists } from '@/lib/subsonic';
import { useAuthStore } from '@/store/authStore';
import {
  AlbumIcon,
  ArtistIcon,
  ChevronRight,
  GenreIcon,
  HeartIcon,
  PlaylistIcon,
  SongIcon,
} from '../ui/Icon';
import PageHeader from '../ui/PageHeader';
import styles from './Library.module.css';

/**
 * The hub the phone's Library tab lands on. Everything the sidebar lists in
 * one column on a desktop lives behind one of these rows, so the tab bar can
 * stay at four entries without anything becoming unreachable.
 */
const SECTIONS = [
  { to: '/songs', label: 'Songs', hint: 'Every track in the library', Icon: SongIcon },
  { to: '/albums', label: 'Albums', hint: 'Browse by release', Icon: AlbumIcon },
  { to: '/artists', label: 'Artists', hint: 'Browse by performer', Icon: ArtistIcon },
  { to: '/genres', label: 'Genres', hint: 'Browse by style', Icon: GenreIcon },
  { to: '/playlists', label: 'Playlists', hint: 'Your own collections', Icon: PlaylistIcon },
  { to: '/starred', label: 'Starred', hint: 'Everything you favourited', Icon: HeartIcon },
];

export default function Library() {
  const config = useAuthStore((s) => s.config);

  const { data: playlists } = useQuery({
    queryKey: ['playlists'],
    queryFn: () => getPlaylists(config!),
    enabled: !!config,
  });

  return (
    <div className={styles.page}>
      <PageHeader title="Library" subtitle="Everything on your server" />

      <div className={styles.sections}>
        {SECTIONS.map(({ to, label, hint, Icon }) => (
          <Link key={to} to={to} className={styles.section}>
            <span className={styles.sectionIcon}>
              <Icon size={20} />
            </span>
            <span className={styles.sectionText}>
              <span className={styles.sectionLabel}>{label}</span>
              <span className={styles.sectionHint}>{hint}</span>
            </span>
            <ChevronRight size={16} className={styles.chevron} />
          </Link>
        ))}
      </div>

      {playlists && playlists.length > 0 && (
        <section className={styles.playlists}>
          <h2 className={styles.heading}>
            Your playlists
            <Link to="/playlists">See all</Link>
          </h2>
          {playlists.map((p) => (
            <Link key={p.id} to={`/playlist/${p.id}`} className={styles.playlistRow}>
              <span className={styles.playlistName}>{p.name}</span>
              <span className={styles.playlistCount}>{p.songCount}</span>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
