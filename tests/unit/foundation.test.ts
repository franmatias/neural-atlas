import { describe, expect, it } from 'vitest';
import { parseDecimal, formatNumber } from '@/shared/utils/decimal';
import { defaults, readPreferences, validatePreferences, writePreferences } from '@/infrastructure/persistence/preferences';
import { translate } from '@/app/i18n';
import { concepts, searchConcepts } from '@/content/concepts';
describe('decimal didáctico', () => {
  it.each(['0,8', '0.8', '8e-1', ' +0,80 ', '−0,8'])('acepta %s', text => { expect(parseDecimal(text, -2, 2)).toEqual({ ok: true, value: text.includes('−') ? -0.8 : 0.8 }); });
  it.each(['', '1.000,5', '1,2.3', 'NaN', 'Infinity', '1e999', '0x10', '--1'])('rechaza %s', text => expect(parseDecimal(text, -2, 2)).toEqual({ ok: false, reason: 'syntax' }));
  it('valida rango y normaliza cero', () => { expect(parseDecimal('3', -2, 2)).toEqual({ ok: false, reason: 'range' }); expect(parseDecimal('-0', -2, 2)).toEqual({ ok: true, value: 0 }); expect(formatNumber(-0)).toBe('0'); expect(formatNumber(0.608259)).toBe('0,6083'); });
});
describe('preferencias versionadas', () => {
  it('recupera valores seguros con datos incompletos o corruptos', () => { expect(validatePreferences(null)).toEqual(defaults); expect(validatePreferences({ speed: Infinity, theme: 'bad', presentation: true, motion: 'reduced', level: 'formal' })).toEqual({ ...defaults, presentation: true, motion: 'reduced', level: 'formal' }); expect(readPreferences({ getItem: () => '{', setItem: () => {} })).toEqual(defaults); expect(readPreferences({ getItem: () => '{"schemaVersion":99}', setItem: () => {} })).toEqual(defaults); });
  it('guarda solo preferencias válidas y tolera denegación', () => { expect(writePreferences(localStorage, { ...defaults, theme: 'dark', speed: 2, level: 'steps' })).toBe(true); expect(readPreferences(localStorage)).toEqual({ ...defaults, theme: 'dark', speed: 2, level: 'steps' }); const denied = { getItem: () => { throw Error('denied'); }, setItem: () => { throw Error('denied'); } }; expect(readPreferences(denied)).toEqual(defaults); expect(writePreferences(denied, { ...defaults })).toBe(false); expect(writePreferences(undefined, { ...defaults })).toBe(false); expect(readPreferences(undefined)).toEqual(defaults); });
});
describe('contenido e idioma', () => {
  it('busca solo los conceptos publicados en ambos idiomas', () => { expect(searchConcepts('BIAS').map(c => c.id)).toContain('C028'); expect(searchConcepts('SIGMOIDE')[0]?.id).toBe('C041'); expect(searchConcepts('retropropagation')).toHaveLength(0); expect(searchConcepts('')).toHaveLength(concepts.length); });
  it('explicita fallback español y sustituye parámetros', () => { expect(translate('nav.home', 'ca')).toBe('Inicio'); expect(translate('glossary.count', 'es', { count: 15 })).toBe('15 conceptos disponibles'); expect(translate('glossary.count')).toContain('{count}'); });
});

