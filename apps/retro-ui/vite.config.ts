import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { assertPublicRpcEnv } from './scripts/public-rpc-env';

export default defineConfig(({ mode }) => {
  assertPublicRpcEnv({ ...loadEnv(mode, import.meta.dirname, 'VITE_'), ...process.env });
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
      },
    },
    server: {
      proxy: {
        '/api/referrals': { target: 'http://127.0.0.1:8788', changeOrigin: false },
        '/api/media': { target: 'http://127.0.0.1:8790', changeOrigin: false },
      },
      // HMR is disabled when editing through agents to avoid flicker.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
