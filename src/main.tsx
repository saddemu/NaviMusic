import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { registerServiceWorker } from './lib/pwa';
import { preconnectToServer } from './lib/preconnect';
import { SubsonicError } from './types/subsonic';
import '@fontsource-variable/dm-sans';
import './styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      // Retry once, and only what is worth retrying. A server that is down
      // (-1) or that has rejected our credentials (40/41) will say the same
      // thing on the next two attempts, and Home alone fires four queries —
      // blind retries turned one outage into twelve failed requests before
      // the user saw a word about it.
      retry: (failureCount, error) => {
        if (error instanceof SubsonicError) {
          if (error.code === -1 || error.code === 40 || error.code === 41) return false;
        }
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
  },
});

// Before React mounts: the first API call and every piece of artwork is
// cross-origin, so the handshake may as well be in flight already.
preconnectToServer();

registerServiceWorker();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Missing #root');

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
