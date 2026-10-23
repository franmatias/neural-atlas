import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/app/main.ts',
        'src/app/router.ts',
        'src/infrastructure/workers/data.worker.ts', // Declarative bootstrap; handler/client and real Worker are tested separately.
        'src/infrastructure/workers/training.worker.ts', // Declarative port wiring; runtime/client and the native Worker have separate tests.
        'src/content/**',
        'src/app/i18n/messages/**',
        '**/*.d.ts',
      ],
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      thresholds: {
        lines: 85,
        statements: 85,
        functions: 85,
        branches: 80,
        'src/domain/**': { lines: 95, statements: 95, functions: 95, branches: 90 },
        'src/application/**': { lines: 90, statements: 90, functions: 90, branches: 85 },
        'src/infrastructure/**': { lines: 90, statements: 90, functions: 90, branches: 85 },
      },
    },
  },
});
