import { defineConfig } from 'vite';

const target = process.env.FRONTEND_API_TARGET || 'http://127.0.0.1:3001';
const frontendOrigin = 'http://127.0.0.1:5173';
export default defineConfig({
  server: {
    host: '127.0.0.1', port: 5173, strictPort: true,
    proxy: {
      '/api': {
        target, changeOrigin: true,
        configure(proxy) {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Normalize only same-origin requests from this local UI to the
            // upstream origin. Foreign Origin headers remain foreign.
            if (req.headers.origin === frontendOrigin) proxyReq.setHeader('Origin', new URL(target).origin);
          });
        },
      },
    },
  },
});
