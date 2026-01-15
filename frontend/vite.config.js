import { defineConfig } from 'vite'

export default defineConfig({
  // ... konfigurasi lain (jika ada) ...
  server: {
    host: true,       // ✅ WAJIB: Izinkan akses IP eksternal (Docker)
    strictPort: true,
    port: 5173,       // Port standar Vite
    watch: {
      usePolling: true, // ✅ PENTING untuk Windows: Biar kalau save file, browser auto-refresh
    },
  },
})