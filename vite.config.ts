
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
// Explicitly import process from Node.js to resolve type conflicts in the Vite config environment
import process from 'node:process';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    base: '/Legal-report/',
    define: {
      // Safely handle API_KEY, default to empty string if missing
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ""),
      // Essential shim for libraries that expect process.env to exist
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env': {},
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    }
  };
});
