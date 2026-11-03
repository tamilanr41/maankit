import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('/node_modules/')) return;
          if (/\/(react|react-dom|react-router-dom|scheduler|@remix-run)\//.test(id)) return 'react-vendor';
          if (/\/(framer-motion|gsap|lucide-react)\//.test(id)) return 'motion-vendor';
          if (/\/@tanstack\/|\/axios\/|\/react-hook-form\/|\/@hookform\/|\/zod\//.test(id)) return 'data-vendor';
        },
      },
    },
  },
});
