import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    chunkSizeWarningLimit: 600, // 调整大小警告限制到600kb
    assetsDir: 'assets', // 指定资源目录名称
  }
})
