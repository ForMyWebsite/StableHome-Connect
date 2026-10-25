import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['tests/**/*.test.ts'], testTimeout: 30000 },
  resolve: { alias: { '@': new URL('.', import.meta.url).pathname } },
});
