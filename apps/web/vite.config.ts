import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

const ROOT_ENV_DIR = '../..';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ROOT_ENV_DIR, 'VITE_');
  const proxyTarget = env['VITE_DEV_API_PROXY_TARGET'] ?? 'http://localhost:3000';
  return {
    envDir: ROOT_ENV_DIR,
    plugins: [react(), tailwindcss()],
    server: { port: 5173, proxy: { '/api': { target: proxyTarget, changeOrigin: false } } },
    test: {
      environment: 'jsdom',
      setupFiles: ['test/setup.ts'],
      css: false,
    },
  };
});
