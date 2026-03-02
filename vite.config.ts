import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(async ({mode}) => {
  const env = loadEnv(mode, '.', '');

  // Dynamic imports keep this config compatible when Vite bundles it.
  const react = (await import('@vitejs/plugin-react')).default;
  const tailwindcss = (await import('@tailwindcss/vite')).default;

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});
