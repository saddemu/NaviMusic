import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { startAudioEngine } from '@/lib/player';
import { useUiStore, SIDEBAR_BOUNDS } from '@/store/uiStore';
import Sidebar from '../sidebar/Sidebar';
import TopBar from './TopBar';
import Backdrop from './Backdrop';
import PlayerBar from '../player/PlayerBar';
import QueueDrawer from '../player/QueueDrawer';
import LyricsDrawer from '../player/LyricsDrawer';
import NowPlaying from '../player/NowPlaying';
import ToastViewport from '../ui/Toast';
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';
import styles from './AppLayout.module.css';

export default function AppLayout() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const sidebarWidth = useUiStore((s) => s.sidebarWidth);
  const setSidebarWidth = useUiStore((s) => s.setSidebarWidth);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const stop = startAudioEngine();
    return stop;
  }, []);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [location.pathname]);

  // Push sidebar width into the CSS variable for grid-template-columns
  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
  }, [sidebarWidth]);

  // Global drag listeners while resizing
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const w = Math.min(SIDEBAR_BOUNDS.max, Math.max(SIDEBAR_BOUNDS.min, e.clientX));
      setSidebarWidth(w);
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, setSidebarWidth]);

  useGlobalShortcuts();

  return (
    <div className={`${styles.shell}${dragging ? ' ' + styles.dragging : ''}`}>
      <aside className={styles.sidebar}>
        <Sidebar />
        <div
          className={`sb-resize${dragging ? ' dragging' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDoubleClick={() => setSidebarWidth(236)}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
        />
      </aside>
      <div className={styles.mainCol}>
        <Backdrop />
        <TopBar />
        <main className={styles.main} ref={mainRef}>
          <div className={styles.routeFade} key={location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>
      <div className={styles.player}>
        <PlayerBar />
      </div>
      <QueueDrawer />
      <LyricsDrawer />
      <NowPlaying />
      <ToastViewport />
    </div>
  );
}
