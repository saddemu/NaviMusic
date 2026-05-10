import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { getInitials } from '@/lib/utils';
import { ChevronRight, LogoutIcon, SettingsIcon } from '../ui/Icon';
import styles from './TopBar.module.css';

export default function TopBar() {
  const user = useAuthStore((s) => s.user);
  const config = useAuthStore((s) => s.config);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const serverHost = config ? new URL(config.serverUrl).host : '';

  return (
    <div className={styles.bar}>
      <div className={styles.wrap} ref={wrapRef}>
        <button
          className={`${styles.profileBtn}${open ? ' ' + styles.open : ''}`}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          type="button"
        >
          <span className={styles.avatar} aria-hidden>
            {getInitials(user?.username ?? 'U')}
          </span>
          <span className={styles.username}>{user?.username ?? 'Guest'}</span>
          <span className={styles.chev}>
            <ChevronRight size={14} style={{ transform: 'rotate(90deg)' }} />
          </span>
        </button>

        {open && (
          <div className={styles.menu} role="menu">
            <div className={styles.serverBlock}>
              <span className={styles.serverLabel}>Navidrome server</span>
              <div className={styles.serverName}>{serverHost || '—'}</div>
              {config && <div className={styles.serverHint}>Signed in as {user?.username}</div>}
            </div>
            <button
              className={styles.menuItem}
              onClick={() => {
                setOpen(false);
                navigate('/settings');
              }}
              role="menuitem"
              type="button"
            >
              <SettingsIcon size={16} /> Settings
            </button>
            <button
              className={`${styles.menuItem} ${styles.danger}`}
              onClick={() => {
                setOpen(false);
                logout();
                navigate('/login', { replace: true });
              }}
              role="menuitem"
              type="button"
            >
              <LogoutIcon size={16} /> Log out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
