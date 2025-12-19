import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Removed manual loadEnv and process.env definition.
  // The API_KEY is injected automatically into process.env.API_KEY by the environment.
  return {
    plugins: [react()],
    base: '/',
    define: {
      'global': 'window',
    },
    server: {
      port: 3000,
      host: true
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    }
  };
});
