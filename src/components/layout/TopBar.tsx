import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { ping } from '@/lib/subsonic';
import { getInitials } from '@/lib/utils';
import { ChevronRight, LogoutIcon, PulseIcon } from '../ui/Icon';
import styles from './TopBar.module.css';

interface Props {
  /** True once content has scrolled under the bar — see `.scrolled` in the CSS. */
  scrolled?: boolean;
}

/** Round-trip bands, in ms. Anything slower than `slow` reads as a bad link. */
const PING_GOOD = 120;
const PING_SLOW = 400;

export default function TopBar({ scrolled = false }: Props) {
  const user = useAuthStore((s) => s.user);
  const config = useAuthStore((s) => s.config);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Shares its cache key with the Settings page, so opening the menu after a
  // test there shows the reading that test produced instead of repeating it.
  const pingQuery = useQuery({
    queryKey: ['ping'],
    queryFn: async () => {
      const t = performance.now();
      await ping(config!);
      return Math.round(performance.now() - t);
    },
    enabled: !!config && open,
    staleTime: 15_000,
    retry: false,
  });

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

  const latency = pingQuery.data;
  const pingState = pingQuery.isFetching
    ? 'pending'
    : pingQuery.isError
      ? 'down'
      : latency === undefined
        ? 'pending'
        : latency <= PING_GOOD
          ? 'good'
          : latency <= PING_SLOW
            ? 'slow'
            : 'down';

  const pingLabel = pingQuery.isFetching
    ? 'Testing…'
    : pingQuery.isError
      ? 'Unreachable'
      : latency === undefined
        ? '—'
        : `${latency} ms`;

  return (
    <div className={`${styles.bar}${scrolled ? ' ' + styles.scrolled : ''}`}>
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
            {/* Not a link to anywhere — the row reports the round trip to the
                server and re-measures it when pressed. */}
            <button
              className={styles.menuItem}
              onClick={() => pingQuery.refetch()}
              role="menuitem"
              type="button"
              disabled={!config || pingQuery.isFetching}
            >
              <PulseIcon size={16} />
              Ping server
              <span className={`${styles.pingValue} ${styles[pingState]}`}>
                <span className={styles.pingDot} aria-hidden />
                {pingLabel}
              </span>
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
