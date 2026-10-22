import { afterEach, vi } from 'vitest';
import { enableAutoUnmount } from '@vue/test-utils';
enableAutoUnmount(afterEach);
Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn((query: string) => ({ matches: false, media: query, onchange: null, addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })) });
afterEach(() => { localStorage.clear(); document.documentElement.removeAttribute('data-theme'); });
