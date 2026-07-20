import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { join } from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: [],
    alias: {
      '@': join(__dirname, 'src'),
    },
  },
  resolve: {
    alias: {
      '@': join(__dirname, 'src'),
    },
  },
});
