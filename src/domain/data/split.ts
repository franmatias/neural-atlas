import { deriveSeed, shuffle, validateSeed } from '@/domain/random/seeded';
import { datasetHash, hashValue } from './integrity';
import {
  DataError,
  splitNames,
  type DataSplit,
  type Dataset,
  type Sample,
  type SplitName,
  type SplitOptions,
} from './types';
import { validateDataset } from './validation';
export function allocate(count: number, ratios: readonly number[]): number[] {
  const ideal = ratios.map((r) => r * count);
  const sizes = ideal.map(Math.floor);
  const order = ideal
    .map((n, i) => ({ i, fraction: n - sizes[i]! }))
    .sort((a, b) => b.fraction - a.fraction || a.i - b.i);
  const remaining = count - sizes.reduce((a, b) => a + b, 0);
  for (let i = 0; i < remaining; i++) sizes[order[i]!.i]!++;
  return sizes;
}
type Groups = { id: string; rows: Sample[]; counts: number[]; tie: number }[];
function grouped(
  rows: Sample[],
  dataset: Dataset,
  options: SplitOptions,
): Record<SplitName, string[]> {
  const groupedRows = new Map<string, Sample[]>();
  for (const row of rows) {
    const key = row.groupId ?? `row:${row.id}`;
    const members = groupedRows.get(key) ?? [];
    members.push(row);
    groupedRows.set(key, members);
  }
  const stratify = options.strategy === 'stratified-grouped' && dataset.task !== 'regression';
  const classes = stratify ? dataset.classOrder! : [];
  const groups: Groups = [...groupedRows]
    .map(([id, members]) => ({
      id,
      rows: members,
      counts: [
        members.length,
        ...classes.map((c) => members.filter((r) => String(r.target) === c).length),
      ],
      tie: deriveSeed(
        options.seed,
        `split-${Array.from(id)
          .map((c) => c.charCodeAt(0).toString(16))
          .join('')}`,
      ),
    }))
    .sort(
      (a, b) => b.rows.length - a.rows.length || a.tie - b.tie || a.id.localeCompare(b.id, 'en'),
    );
  const totals = [
    rows.length,
    ...classes.map((c) => rows.filter((r) => String(r.target) === c).length),
  ];
  const actual = splitNames.map(() => totals.map(() => 0));
  const assignments: number[] = [];
  const cost = (counts: number[], s: number) =>
    counts.reduce(
      (sum, value, j) =>
        sum +
        ((value - totals[j]! * options.ratios[s]!) /
          Math.max(1, totals[j]! * options.ratios[s]!)) **
          2,
      0,
    );
  for (const group of groups) {
    let best = 0;
    let score = Infinity;
    for (let s = 0; s < 3; s++) {
      const delta =
        cost(
          actual[s]!.map((n, j) => n + group.counts[j]!),
          s,
        ) - cost(actual[s]!, s);
      if (delta < score - 1e-12) {
        score = delta;
        best = s;
      }
    }
    assignments.push(best);
    actual[best] = actual[best]!.map((n, j) => n + group.counts[j]!);
  }
  // Identical count signatures have identical swap costs. Keep one representative per
  // split/signature; this is equivalent to considering those redundant pairs once.
  for (let pass = 0; pass < 10; pass++) {
    let improved = false;
    const representatives = new Map<string, number>();
    groups.forEach((g, i) => {
      const key = `${assignments[i]}:${g.counts.join(',')}`;
      if (!representatives.has(key)) representatives.set(key, i);
    });
    const candidates = [...representatives.values()];
    for (let a = 0; a < candidates.length; a++)
      for (let b = a + 1; b < candidates.length; b++) {
        const i = candidates[a]!;
        const j = candidates[b]!;
        const si = assignments[i]!;
        const sj = assignments[j]!;
        if (si === sj) continue;
        const gi = groups[i]!;
        const gj = groups[j]!;
        const left = actual[si]!.map((n, k) => n - gi.counts[k]! + gj.counts[k]!);
        const right = actual[sj]!.map((n, k) => n - gj.counts[k]! + gi.counts[k]!);
        if (
          cost(left, si) + cost(right, sj) <
          cost(actual[si]!, si) + cost(actual[sj]!, sj) - 1e-12
        ) {
          actual[si] = left;
          actual[sj] = right;
          assignments[i] = sj;
          assignments[j] = si;
          improved = true;
        }
      }
    if (!improved) break;
  }
  const result: Record<SplitName, string[]> = { train: [], validation: [], test: [] };
  groups.forEach((group, i) =>
    result[splitNames[assignments[i]!]!]!.push(...group.rows.map((r) => r.id)),
  );
  return result;
}
function temporal(
  rows: Sample[],
  ratios: readonly [number, number, number],
): Record<SplitName, string[]> {
  if (rows.some((r) => !r.timestamp)) throw new DataError('TIMESTAMP');
  rows = rows.map((row) => ({
    ...row,
    timestamp:
      row.timestamp!.length === 20 ? `${row.timestamp!.slice(0, -1)}.000Z` : row.timestamp!,
  }));
  const groups = new Map<string, Sample[]>();
  for (const row of rows) {
    const key = row.groupId ?? `row:${row.id}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const ranges = [...groups.values()]
    .map((members) => {
      members.sort((a, b) => a.timestamp!.localeCompare(b.timestamp!));
      return {
        rows: members,
        start: members[0]!.timestamp!,
        end: members[members.length - 1]!.timestamp!,
      };
    })
    .sort((a, b) => a.start.localeCompare(b.start));
  const blocks: typeof ranges = [];
  for (const range of ranges) {
    const last = blocks[blocks.length - 1];
    if (last && range.start <= last.end) {
      last.rows.push(...range.rows);
      if (range.end > last.end) last.end = range.end;
    } else blocks.push({ ...range, rows: [...range.rows] });
  }
  const result: Record<SplitName, string[]> = { train: [], validation: [], test: [] };
  let total = 0;
  const cumulative = blocks.map((block) => (total += block.rows.length));
  if (blocks.length < 3) {
    result.train = rows.map((r) => r.id);
    return result;
  }
  // Independent nearest cumulative cuts, constrained to nonempty ordered partitions.
  let first = 0;
  let second = 1;
  for (let i = 1; i < blocks.length - 2; i++)
    if (
      Math.abs(cumulative[i]! - rows.length * ratios[0]) <
      Math.abs(cumulative[first]! - rows.length * ratios[0])
    )
      first = i;
  second = first + 1;
  for (let i = first + 2; i < blocks.length - 1; i++)
    if (
      Math.abs(cumulative[i]! - rows.length * (ratios[0] + ratios[1])) <
      Math.abs(cumulative[second]! - rows.length * (ratios[0] + ratios[1]))
    )
      second = i;
  blocks.forEach((block, i) =>
    result[i <= first ? 'train' : i <= second ? 'validation' : 'test'].push(
      ...block.rows.sort((a, b) => a.timestamp!.localeCompare(b.timestamp!)).map((r) => r.id),
    ),
  );
  return result;
}
export function splitDataset(dataset: Dataset, options: SplitOptions): DataSplit {
  validateDataset(dataset);
  validateSeed(options.seed);
  if (
    !['random', 'stratified', 'grouped', 'stratified-grouped', 'temporal'].includes(
      options.strategy,
    )
  )
    throw new DataError('OPTIONS');
  if (
    options.ratios.length !== 3 ||
    options.ratios.some((r) => !Number.isFinite(r) || r < 0.1 || r > 0.8) ||
    Math.abs(options.ratios.reduce((a, b) => a + b, 0) - 1) > 1e-9
  )
    throw new DataError('RATIO');
  const rows = dataset.rows.filter((row) => row.target !== null);
  let strategy = options.strategy;
  if (rows.some((row) => row.groupId) && (strategy === 'random' || strategy === 'stratified'))
    strategy = dataset.task === 'regression' ? 'grouped' : 'stratified-grouped';
  let result: Record<SplitName, string[]> = { train: [], validation: [], test: [] };
  if (strategy === 'temporal') result = temporal(rows, options.ratios);
  else if (strategy === 'grouped' || strategy === 'stratified-grouped')
    result = grouped(rows, dataset, { ...options, strategy });
  else {
    const strata =
      strategy === 'stratified' && dataset.task !== 'regression'
        ? dataset.classOrder!.map((c) => rows.filter((r) => String(r.target) === c))
        : [rows];
    strata.forEach((members, stratum) => {
      const shuffled = shuffle(members, options.seed, `split-${stratum}`);
      const counts = allocate(members.length, options.ratios);
      let index = 0;
      splitNames.forEach((name, s) => {
        result[name].push(...shuffled.slice(index, index + counts[s]!).map((r) => r.id));
        index += counts[s]!;
      });
    });
  }
  const supportByClass: DataSplit['supportByClass'] = Object.fromEntries(
    (dataset.classOrder ?? []).map((c) => [c, { train: 0, validation: 0, test: 0 }]),
  );
  const lookup = new Map(rows.map((row) => [row.id, row]));
  for (const name of splitNames)
    for (const id of result[name])
      if (dataset.task !== 'regression') supportByClass[String(lookup.get(id)!.target)]![name]++;
  const dataHash = datasetHash(dataset);
  return {
    ...result,
    strategy,
    seed: options.seed,
    ratios: options.ratios,
    dataHash,
    supportByClass,
    splitHash: hashValue({ ...result, strategy, seed: options.seed, dataHash }),
  };
}
export function validateSplit(dataset: Dataset, split: DataSplit): void {
  if (split.dataHash !== datasetHash(dataset)) throw new DataError('INTEGRITY', 'dataHash');
  const expected = splitDataset(dataset, {
    strategy: split.strategy,
    ratios: split.ratios,
    seed: split.seed,
  });
  if (hashValue(expected) !== hashValue(split)) throw new DataError('INTEGRITY', 'splitHash');
}
export function splitWarnings(split: DataSplit): { blocked: boolean; unstable: boolean } {
  const counts = Object.values(split.supportByClass);
  return {
    blocked:
      split.train.length < 2 ||
      split.validation.length === 0 ||
      split.test.length === 0 ||
      counts.some((c) => c.train < 2 || c.validation < 1 || c.test < 1),
    unstable: counts.some((c) => c.validation < 5 || c.test < 5),
  };
}
