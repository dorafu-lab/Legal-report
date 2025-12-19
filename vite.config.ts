import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    // 使用相對路徑，確保在 GitHub Pages 的子目錄下也能正確讀取 JS/CSS
    base: './',
    define: {
      // 確保生產環境中 process.env 存在，防止程式崩潰
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ""),
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env': {},
      'global': 'window', // 墊片：解決部分套件依賴 global 變數的問題
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      // 確保 Vite 不會因找不到模組而報錯
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    }
  };
});