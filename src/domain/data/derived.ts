import { DataError, type Sample } from './types';
import { safeId } from './validation';
export interface DerivedFeature {
  id: string;
  operation: 'square' | 'product' | 'log1p';
  sources: string[];
}
export function validateDerived(definitions: DerivedFeature[], numericIds: string[]) {
  if (
    !Array.isArray(definitions) ||
    definitions.length < 1 ||
    definitions.length > 8 ||
    new Set(definitions.map((d) => d.id)).size !== definitions.length
  )
    throw new DataError('PIPELINE', 'derived');
  for (const d of definitions) {
    if (
      !d ||
      !safeId(d.id) ||
      Object.keys(d).sort().join(',') !== 'id,operation,sources' ||
      !['square', 'product', 'log1p'].includes(d.operation) ||
      !Array.isArray(d.sources) ||
      d.sources.length !== (d.operation === 'product' ? 2 : 1) ||
      d.sources.some((id) => !numericIds.includes(id))
    )
      throw new DataError('PIPELINE', 'derived');
  }
}
export function derivedValue(
  definition: DerivedFeature,
  row: Sample,
  fills: Map<string, number>,
): number {
  const values = definition.sources.map((id) => {
    const value = row.features[id] === null ? fills.get(id) : row.features[id];
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new DataError('PIPELINE', id);
    return value;
  });
  if (definition.operation === 'log1p' && values[0]! <= -1)
    throw new DataError('PIPELINE', 'log1p: x > -1');
  const result =
    definition.operation === 'square'
      ? values[0]! ** 2
      : definition.operation === 'product'
        ? values[0]! * values[1]!
        : Math.log1p(values[0]!);
  if (!Number.isFinite(result)) throw new DataError('NON_FINITE', definition.id);
  return result;
}
export function derivedLabel(d: DerivedFeature, names: Map<string, string>) {
  const a = names.get(d.sources[0]!)!;
  return `${d.id} = ${d.operation === 'square' ? `${a}²` : d.operation === 'product' ? `${a} × ${names.get(d.sources[1]!)!}` : `log1p(${a})`}`;
}
