import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./resources/js', import.meta.url))
    }
  },
  publicDir: false,
  build: {
    outDir: 'public/build',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/finflow.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/finflow.[ext]'
      }
    }
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['tests/Frontend/**/*.spec.ts']
  }
})
