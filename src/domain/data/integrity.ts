import { sha256 } from '@noble/hashes/sha2.js';
import { DataError, type Dataset } from './types';
export function utf8(text: string): Uint8Array {
  const bytes = new Uint8Array(utf8Length(text));
  let index = 0;
  for (const char of text) {
    let p = char.codePointAt(0)!;
    if (p >= 0xd800 && p <= 0xdfff) p = 0xfffd;
    if (p < 0x80) bytes[index++] = p;
    else if (p < 0x800) {
      bytes[index++] = 0xc0 | (p >> 6);
      bytes[index++] = 0x80 | (p & 63);
    } else if (p < 0x10000) {
      bytes[index++] = 0xe0 | (p >> 12);
      bytes[index++] = 0x80 | ((p >> 6) & 63);
      bytes[index++] = 0x80 | (p & 63);
    } else {
      bytes[index++] = 0xf0 | (p >> 18);
      bytes[index++] = 0x80 | ((p >> 12) & 63);
      bytes[index++] = 0x80 | ((p >> 6) & 63);
      bytes[index++] = 0x80 | (p & 63);
    }
  }
  return bytes;
}
export function utf8Length(text: string): number {
  let length = 0;
  for (const char of text) {
    const p = char.codePointAt(0)!;
    length += p < 0x80 ? 1 : p < 0x800 ? 2 : p < 0x10000 ? 3 : 4;
  }
  return length;
}
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (
    typeof value === 'object' &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype
  )
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`,
      )
      .join(',')}}`;
  throw new DataError('SCHEMA', 'canonical-json-v1');
}
export function hashText(text: string): string {
  return Array.from(sha256(utf8(text)), (b) => b.toString(16).padStart(2, '0')).join('');
}
export const hashValue = (value: unknown) => hashText(canonicalJson(value));
export function datasetHash(dataset: Dataset) {
  return hashValue({
    task: dataset.task,
    features: dataset.features,
    targetName: dataset.targetName,
    classOrder: dataset.classOrder ?? [],
    rows: dataset.rows,
  });
}
