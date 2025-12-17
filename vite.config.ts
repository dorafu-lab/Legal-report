import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // 載入環境變數，第三個參數 '' 表示載入所有變數，不限制 VITE_ 開頭
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    base: '/Legal-report/', // GitHub Pages 的 Repo 名稱
    define: {
      // 關鍵修復：解決瀏覽器報錯 "process is not defined"
      // 將編譯時期的環境變數注入到前端程式碼中
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.API_KEY || ''),
      'process.env': {} // 防止其他套件引用 process.env 時崩潰
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    }
  };
});