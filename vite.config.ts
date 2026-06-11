import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          audio: ['howler'],
        },
      },
    },
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
  // Dev server binds to localhost only. Run `vite --host` explicitly if you
  // need LAN access (e.g. testing from a phone).
  server: {
    port: 5173,
  },
});
