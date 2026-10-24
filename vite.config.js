import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.DEPLOY_TARGET === 'render' ? '/' : '/cooperativadeservi-os/',
  server: { proxy: { '/api': 'http://localhost:3000' } },
});
