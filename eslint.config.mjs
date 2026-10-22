import js from '@eslint/js';
import vue from 'eslint-plugin-vue';
import ts from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default ts.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'docs/**', 'playwright-report/**', 'test-results/**', 'scripts/**'] },
  js.configs.recommended, ...ts.configs.recommended, ...vue.configs['flat/recommended'],
  { files: ['**/*.vue'], languageOptions: { parserOptions: { parser: ts.parser } } },
  { files: ['src/**/*.{ts,vue}', 'tests/**/*.ts', '*.config.ts'], languageOptions: { globals: { window: 'readonly', document: 'readonly', navigator: 'readonly', Storage: 'readonly', HTMLInputElement: 'readonly', HTMLElement: 'readonly', HTMLDialogElement: 'readonly', SVGSVGElement: 'readonly', SVGElement: 'readonly', KeyboardEvent: 'readonly', PointerEvent: 'readonly', MouseEvent: 'readonly', Event: 'readonly', FocusEvent: 'readonly', performance: 'readonly', requestAnimationFrame: 'readonly', cancelAnimationFrame: 'readonly', localStorage: 'readonly', matchMedia: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', console: 'readonly', process: 'readonly' } }, rules: { 'vue/multi-word-component-names': ['error', { ignores: ['App'] }], 'vue/no-v-html': 'error' } },
  { files: ['src/domain/**/*.ts'], rules: {
    'no-restricted-imports': ['error', { patterns: ['vue', 'pinia', 'vue-router', '@/features/*', '@/stores/*', '@/infrastructure/*', '@/visualization/*'] }],
    'no-restricted-globals': ['error', 'window', 'document', 'navigator', 'localStorage', 'Worker', 'Date'],
    'no-restricted-properties': ['error', { object: 'Math', property: 'random', message: 'Use a seeded random source.' }],
  } },
  { files: ['public/*.js'], languageOptions: { globals: { document: 'readonly', localStorage: 'readonly', matchMedia: 'readonly' } } },
  prettier,
);
