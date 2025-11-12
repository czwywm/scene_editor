import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// import vueDevTools from 'vite-plugin-vue-devtools'
import path from 'path'


export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      three: path.resolve(__dirname, 'node_modules/three'),
    },
  },
  base: './',
  define: {
    __isProduction__: process.env.NODE_ENV === 'production',
  },
})
