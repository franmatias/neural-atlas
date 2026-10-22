import { es, type MessageKey } from './messages/es';
export type { MessageKey } from './messages/es';

export type Locale = 'es' | 'en' | 'ca' | 'gl' | 'eu';
export const publishedLocales: readonly Locale[] = ['es'];
const translations: Partial<Record<Locale, Partial<Record<MessageKey, string>>>> = {};

export function translate(
  key: MessageKey,
  locale: Locale = 'es',
  values: Record<string, string | number> = {},
): string {
  const template = translations[locale]?.[key] ?? es[key];
  return template.replace(/\{(\w+)\}/g, (match, name: string) => String(values[name] ?? match));
}
export function useI18n() {
  return {
    t: (key: MessageKey, values?: Record<string, string | number>) => translate(key, 'es', values),
  };
}
