import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import { showToast } from './store/toastStore';
import AppLayout from './components/layout/AppLayout';

const Login = lazy(() => import('./components/pages/Login'));
const Home = lazy(() => import('./components/pages/Home'));
const Albums = lazy(() => import('./components/pages/Albums'));
const Artists = lazy(() => import('./components/pages/Artists'));
const Songs = lazy(() => import('./components/pages/Songs'));
const Genres = lazy(() => import('./components/pages/Genres'));
const Search = lazy(() => import('./components/pages/Search'));
const Playlists = lazy(() => import('./components/pages/Playlists'));
const PlaylistDetail = lazy(() => import('./components/pages/PlaylistDetail'));
const AlbumDetail = lazy(() => import('./components/pages/AlbumDetail'));
const ArtistDetail = lazy(() => import('./components/pages/ArtistDetail'));
const Starred = lazy(() => import('./components/pages/Starred'));
const Settings = lazy(() => import('./components/pages/Settings'));

function PageFallback() {
  return (
    <div
      style={{
        height: '60vh',
        display: 'grid',
        placeItems: 'center',
        color: 'var(--text-tertiary)',
        fontSize: '0.8125rem',
      }}
    >
      Loading…
    </div>
  );
}

function ProtectedRoutes() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const location = useLocation();

  if (!isHydrated) return null;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return (
    <Suspense fallback={<PageFallback />}>
      <AppLayout />
    </Suspense>
  );
}

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Online/offline notifications
  useEffect(() => {
    const onOffline = () => showToast('No internet connection', 'error');
    const onOnline = () => {
      showToast('Back online', 'success');
      queryClient.refetchQueries();
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, [queryClient]);

  // Listen for global auth-error custom events
  useEffect(() => {
    const onAuthError = () => {
      logout();
      showToast('Session expired. Please log in again.', 'error');
      navigate('/login', { replace: true });
    };
    window.addEventListener('pmusic:auth-error', onAuthError);
    return () => window.removeEventListener('pmusic:auth-error', onAuthError);
  }, [logout, navigate]);

  if (!isHydrated) return null;

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <Suspense fallback={<PageFallback />}>
            <Login />
          </Suspense>
        }
      />
      <Route element={<ProtectedRoutes />}>
        <Route
          path="/"
          element={
            <Suspense fallback={<PageFallback />}>
              <Home />
            </Suspense>
          }
        />
        <Route
          path="/albums"
          element={
            <Suspense fallback={<PageFallback />}>
              <Albums />
            </Suspense>
          }
        />
        <Route
          path="/album/:id"
          element={
            <Suspense fallback={<PageFallback />}>
              <AlbumDetail />
            </Suspense>
          }
        />
        <Route
          path="/artists"
          element={
            <Suspense fallback={<PageFallback />}>
              <Artists />
            </Suspense>
          }
        />
        <Route
          path="/artist/:id"
          element={
            <Suspense fallback={<PageFallback />}>
              <ArtistDetail />
            </Suspense>
          }
        />
        <Route
          path="/songs"
          element={
            <Suspense fallback={<PageFallback />}>
              <Songs />
            </Suspense>
          }
        />
        <Route
          path="/genres"
          element={
            <Suspense fallback={<PageFallback />}>
              <Genres />
            </Suspense>
          }
        />
        <Route
          path="/search"
          element={
            <Suspense fallback={<PageFallback />}>
              <Search />
            </Suspense>
          }
        />
        <Route
          path="/playlists"
          element={
            <Suspense fallback={<PageFallback />}>
              <Playlists />
            </Suspense>
          }
        />
        <Route
          path="/playlist/:id"
          element={
            <Suspense fallback={<PageFallback />}>
              <PlaylistDetail />
            </Suspense>
          }
        />
        <Route
          path="/starred"
          element={
            <Suspense fallback={<PageFallback />}>
              <Starred />
            </Suspense>
          }
        />
        <Route
          path="/settings"
          element={
            <Suspense fallback={<PageFallback />}>
              <Settings />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
