import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
    // Configuración para mejorar los logs
    hmr: {
      clientPort: 3000,
      overlay: false
    },
    logLevel: 'warn',
    clearScreen: false
  },
  // Configuración personalizada de la consola
  customLogger: {
    info: (msg) => {
      if (msg.includes('Local:') || msg.includes('Network:')) {
        console.log(`[FRONTEND] ${msg}`);
      }
    },
    warn: (msg) => {
      if (!msg.includes('sourcemap')) {  // Filtramos advertencias de sourcemaps
        console.warn(`[FRONTEND] ${msg}`);
      }
    },
    error: (msg) => console.error(`[FRONTEND] ${msg}`),
    clearScreen: () => {}
  },
  build: {
    minify: 'esbuild',
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          vendor: ['axios', 'react-hook-form', 'zod'],
          ui: ['antd', '@ant-design/icons', 'lucide-react']
        }
      }
    }
  }
});
