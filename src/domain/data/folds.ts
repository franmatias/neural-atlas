import { shuffle, validateSeed } from '@/domain/random/seeded';
import { DataError, type Dataset, type FoldSelection } from './types';
export function validateFold(fold: FoldSelection) {
  validateSeed(fold.seed);
  if (
    fold.kind !== 'k-fold-v1' ||
    !Number.isInteger(fold.count) ||
    fold.count < 2 ||
    fold.count > 10 ||
    !Number.isInteger(fold.index) ||
    fold.index < 0 ||
    fold.index >= fold.count ||
    !['random', 'stratified', 'grouped'].includes(fold.strategy)
  )
    throw new DataError('OPTIONS', 'fold');
}
/** Called only with a validated base split. The final test IDs are never redistributed. */
export function foldPartition(
  dataset: Dataset,
  base: { train: string[]; validation: string[]; test: string[] },
  fold: FoldSelection,
) {
  validateFold(fold);
  const pool = [...base.train, ...base.validation];
  const lookup = new Map(dataset.rows.map((row) => [row.id, row]));
  const members = pool.map((id) => lookup.get(id)!);
  if (pool.length < fold.count || (members.some((r) => r.groupId) && fold.strategy !== 'grouped'))
    throw new DataError('OPTIONS', 'fold-groups');
  const bins: string[][] = Array.from({ length: fold.count }, () => []);
  if (fold.strategy === 'grouped') {
    const groups = new Map<string, string[]>();
    for (const row of members) {
      const key = row.groupId ? `group:${row.groupId}` : `row:${row.id}`;
      const group = groups.get(key) ?? [];
      group.push(row.id);
      groups.set(key, group);
    }
    if (groups.size < fold.count) throw new DataError('OPTIONS', 'fold-groups');
    const ordered = shuffle([...groups.values()], fold.seed, 'cv-groups').sort(
      (a, b) => b.length - a.length,
    );
    for (const group of ordered) {
      const index = bins.reduce((best, bin, i) => (bin.length < bins[best]!.length ? i : best), 0);
      bins[index]!.push(...group);
    }
  } else {
    if (fold.strategy === 'stratified' && dataset.task === 'regression')
      throw new DataError('OPTIONS', 'fold-task');
    const strata =
      fold.strategy === 'stratified'
        ? dataset.classOrder!.map((c) => pool.filter((id) => String(lookup.get(id)!.target) === c))
        : [pool];
    let offset = 0;
    strata.forEach((stratum, i) => {
      if (stratum.length < fold.count) throw new DataError('TARGET', 'fold-support');
      shuffle(stratum, fold.seed, `cv-${i}`).forEach((id, j) =>
        bins[(offset + j) % fold.count]!.push(id),
      );
      offset = (offset + stratum.length) % fold.count;
    });
  }
  return {
    train: bins.filter((_, i) => i !== fold.index).flat(),
    validation: [...bins[fold.index]!],
    test: [...base.test],
  };
}
