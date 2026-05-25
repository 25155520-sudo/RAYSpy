import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    CESIUM_BASE_URL: JSON.stringify('/cesium/')
  },
  server: {
    proxy: {
      '/geocode': {
        target: 'http://localhost:5176',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/geocode/, '/geocode'),
      },
    },
  },
});
