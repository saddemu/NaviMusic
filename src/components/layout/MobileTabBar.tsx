import { NavLink, useLocation } from 'react-router-dom';
import { HomeIcon, LibraryIcon, SearchIcon, SettingsIcon } from '../ui/Icon';
import styles from './MobileTabBar.module.css';

/**
 * Every route that lives under Library, so the tab stays lit while the user is
 * three screens deep inside it. `/` is matched exactly and handled by NavLink's
 * `end`, which is why it is not in here.
 */
const LIBRARY_PREFIXES = [
  '/library',
  '/songs',
  '/albums',
  '/album/',
  '/artists',
  '/artist/',
  '/genres',
  '/playlists',
  '/playlist/',
  '/starred',
];

export default function MobileTabBar() {
  const { pathname } = useLocation();
  const libraryActive = LIBRARY_PREFIXES.some(
    (p) => pathname === p || pathname === p.replace(/\/$/, '') || pathname.startsWith(p),
  );

  const tab = ({ isActive }: { isActive: boolean }) =>
    `${styles.tab}${isActive ? ' ' + styles.active : ''}`;

  return (
    <nav className={styles.bar} aria-label="Primary">
      <NavLink to="/" end className={tab}>
        <HomeIcon size={21} />
        <span>Home</span>
      </NavLink>
      <NavLink to="/search" className={tab}>
        <SearchIcon size={21} />
        <span>Search</span>
      </NavLink>
      <NavLink
        to="/library"
        className={`${styles.tab}${libraryActive ? ' ' + styles.active : ''}`}
        aria-current={libraryActive ? 'page' : undefined}
      >
        <LibraryIcon size={21} />
        <span>Library</span>
      </NavLink>
      <NavLink to="/settings" className={tab}>
        <SettingsIcon size={21} />
        <span>Settings</span>
      </NavLink>
    </nav>
  );
}
