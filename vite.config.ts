import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset paths: the build works at any URL – the site root locally, /magnetic-field/ on GitHub Pages.
  base: './',
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
