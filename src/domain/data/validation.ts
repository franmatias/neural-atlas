import { DataError, type Dataset } from './types';
const forbidden = new Set(['__proto__', 'constructor', 'prototype']);
export const safeId = (value: string) =>
  value.length > 0 && value.length <= 128 && !forbidden.has(value) && /^[\w.-]+$/.test(value);
export function validTimestamp(text: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{3})?Z$/.exec(text);
  if (!match) return false;
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return (
    year >= 1 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]! &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59
  );
}
export function validateDataset(dataset: Dataset): void {
  if (
    !safeId(dataset.id) ||
    !Number.isInteger(dataset.revision) ||
    dataset.revision < 1 ||
    !['binary', 'multiclass', 'regression'].includes(dataset.task)
  )
    throw new DataError('SCHEMA');
  if (!dataset.targetName.trim() || dataset.targetName.length > 4096) throw new DataError('TARGET');
  if (dataset.rows.length > 10000 || dataset.features.length < 1 || dataset.features.length > 63)
    throw new DataError('LIMIT');
  const features = new Set<string>();
  for (const f of dataset.features) {
    if (
      !safeId(f.id) ||
      features.has(f.id) ||
      !f.name.trim() ||
      f.name.length > 4096 ||
      f.name === dataset.targetName ||
      !['numeric', 'categorical'].includes(f.kind) ||
      (f.unit !== undefined && f.unit.length > 4096)
    )
      throw new DataError('SCHEMA', f.id);
    features.add(f.id);
  }
  if (
    dataset.task !== 'regression' &&
    (!dataset.classOrder ||
      new Set(dataset.classOrder).size !== dataset.classOrder.length ||
      dataset.classOrder.length < 2 ||
      dataset.classOrder.length > 10 ||
      (dataset.task === 'binary' && dataset.classOrder.length !== 2) ||
      dataset.classOrder.some((c) => !c.length || c.length > 4096))
  )
    throw new DataError('TARGET');
  const ids = new Set<string>();
  for (const row of dataset.rows) {
    if (
      !safeId(row.id) ||
      ids.has(row.id) ||
      (row.groupId !== undefined && !safeId(row.groupId)) ||
      !['generated', 'imported', 'manual', 'augmented'].includes(row.origin)
    )
      throw new DataError('SCHEMA', row.id);
    ids.add(row.id);
    if (row.timestamp !== undefined && !validTimestamp(row.timestamp))
      throw new DataError('TIMESTAMP', row.id);
    if (Object.keys(row.features).length !== features.size) throw new DataError('SCHEMA', row.id);
    for (const f of dataset.features) {
      const value = row.features[f.id];
      if (value === null) continue;
      if (
        f.kind === 'numeric'
          ? typeof value !== 'number' || !Number.isFinite(value)
          : typeof value !== 'string' || value.length > 4096
      )
        throw new DataError('SCHEMA', `${row.id}.${f.id}`);
    }
    if (
      row.target !== null &&
      (dataset.task === 'regression'
        ? typeof row.target !== 'number' || !Number.isFinite(row.target)
        : !dataset.classOrder!.includes(String(row.target)) ||
          !['string', 'number'].includes(typeof row.target) ||
          (typeof row.target === 'number' && !Number.isFinite(row.target)))
    )
      throw new DataError('TARGET', row.id);
  }
}
