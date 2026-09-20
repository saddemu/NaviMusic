import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPlaylists, createPlaylist } from '@/lib/subsonic';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { REPO_URL } from '@/lib/constants';
import {
  AlbumIcon,
  ArtistIcon,
  BrandMark,
  ChevronRight,
  GenreIcon,
  GithubIcon,
  HeartIcon,
  HomeIcon,
  LibraryIcon,
  PlaylistIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  SongIcon,
} from '../ui/Icon';
import Modal from '../ui/Modal';
import { showToast } from '@/store/toastStore';
import styles from './Sidebar.module.css';

const COLLAPSED_THRESHOLD = 140;

export default function Sidebar() {
  const config = useAuthStore((s) => s.config);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const sidebarWidth = useUiStore((s) => s.sidebarWidth);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const collapsed = sidebarWidth < COLLAPSED_THRESHOLD;

  const [searchValue, setSearchValue] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const { data: playlists } = useQuery({
    queryKey: ['playlists'],
    queryFn: () => getPlaylists(config!),
    enabled: !!config,
  });

  const navItem = ({ isActive }: { isActive: boolean }) =>
    `${styles.item}${isActive ? ' ' + styles.active : ''}`;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchValue.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const handleCreate = async () => {
    if (!config || !newName.trim()) return;
    try {
      await createPlaylist(config, newName.trim());
      showToast('Playlist created', 'success');
      setNewName('');
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    } catch {
      showToast('Failed to create playlist', 'error');
    }
  };

  return (
    <nav
      className={`${styles.sidebar}${collapsed ? ' ' + styles.collapsed : ''}`}
      aria-label="Primary"
    >
      <div className={styles.brandRow}>
        <div className={styles.brand}>
          <BrandMark size={22} className={styles.brandMark} />
          {!collapsed && <span className={styles.brandText}>NaviMusic</span>}
        </div>
        {!collapsed && (
          <button
            className={styles.collapseBtn}
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
            type="button"
            title="Collapse"
          >
            <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          className={styles.collapseBtn}
          onClick={toggleSidebar}
          aria-label="Expand sidebar"
          type="button"
          title="Expand"
        >
          <ChevronRight size={16} />
        </button>
      )}

      {!collapsed && (
        <form onSubmit={handleSearchSubmit} className={styles.searchWrap} role="search">
          <SearchIcon size={16} />
          <input
            className={styles.search}
            type="search"
            placeholder="Search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            aria-label="Search music"
          />
        </form>
      )}

      <div className={styles.section}>
        <NavLink to="/" end className={navItem} title="Home">
          <HomeIcon size={18} /> <span className={styles.itemLabel}>Home</span>
        </NavLink>
        <NavLink to="/search" className={navItem} title="Search">
          <SearchIcon size={18} /> <span className={styles.itemLabel}>Search</span>
        </NavLink>
        <NavLink to="/library" className={navItem} title="Library">
          <LibraryIcon size={18} /> <span className={styles.itemLabel}>Library</span>
        </NavLink>
        <NavLink to="/albums" className={navItem} title="Albums">
          <AlbumIcon size={18} /> <span className={styles.itemLabel}>Albums</span>
        </NavLink>
        <NavLink to="/artists" className={navItem} title="Artists">
          <ArtistIcon size={18} /> <span className={styles.itemLabel}>Artists</span>
        </NavLink>
        <NavLink to="/songs" className={navItem} title="Songs">
          <SongIcon size={18} /> <span className={styles.itemLabel}>Songs</span>
        </NavLink>
        <NavLink to="/genres" className={navItem} title="Genres">
          <GenreIcon size={18} /> <span className={styles.itemLabel}>Genres</span>
        </NavLink>
        <NavLink to="/starred" className={navItem} title="Starred">
          <HeartIcon size={18} /> <span className={styles.itemLabel}>Starred</span>
        </NavLink>
      </div>

      <div className={styles.section}>
        {!collapsed && <div className={styles.label}>Playlists</div>}
        <NavLink to="/playlists" className={navItem} title="All playlists">
          <PlaylistIcon size={18} /> <span className={styles.itemLabel}>All Playlists</span>
        </NavLink>
        <button
          className={styles.createBtn}
          onClick={() => setCreateOpen(true)}
          type="button"
          title="New playlist"
        >
          <PlusIcon size={14} /> <span>New playlist</span>
        </button>
      </div>

      {!collapsed && (
        <div className={styles.playlists}>
          {playlists?.map((p) => (
            <NavLink
              key={p.id}
              to={`/playlist/${p.id}`}
              className={({ isActive }) =>
                `${styles.playlistItem}${isActive ? ' ' + styles.active : ''}`
              }
            >
              <span className={styles.playlistName}>{p.name}</span>
              <span className={styles.badge}>{p.songCount}</span>
            </NavLink>
          ))}
        </div>
      )}

      {/* Settings used to live in the profile menu; that row now reports the
          server round trip, so the sidebar carries the link. */}
      <div className={styles.footer}>
        <NavLink to="/settings" className={navItem} title="Settings" end>
          <SettingsIcon size={18} /> <span className={styles.itemLabel}>Settings</span>
        </NavLink>
        <a
          className={`${styles.item} ${styles.repoLink}`}
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="View on GitHub"
        >
          <GithubIcon size={18} /> <span className={styles.itemLabel}>View on GitHub</span>
        </a>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New playlist"
        actions={
          <>
            <button onClick={() => setCreateOpen(false)} className="btn-ghost" type="button">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="btn-primary"
              type="button"
              disabled={!newName.trim()}
            >
              Create
            </button>
          </>
        }
      >
        <input
          autoFocus
          className="input"
          placeholder="Playlist name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
      </Modal>
    </nav>
  );
}
