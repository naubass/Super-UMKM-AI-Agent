import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: true,       
    strictPort: true,
    port: 5173,       
    watch: {
      usePolling: true, 
    },
  },
})