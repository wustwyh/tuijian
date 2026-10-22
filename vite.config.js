import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { productApi } from './server/products.mjs';

export default defineConfig({
  plugins: [react(), productApi(fileURLToPath(new URL('.', import.meta.url)))],
  preview: { allowedHosts: true },
});
