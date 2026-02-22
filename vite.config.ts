import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  build: {
    // Inline all assets under this size (in bytes) — effectively everything
    assetsInlineLimit: Infinity,
    cssCodeSplit: false,
  },
})
