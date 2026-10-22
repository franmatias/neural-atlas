import type { Dataset, Defect } from './types';
export function profileDataset(dataset: Dataset) {
  const support: Record<string, number> = Object.fromEntries(
    (dataset.classOrder ?? []).map((c) => [c, 0]),
  );
  const defects: Record<Defect, number> = {
    noise: 0,
    outlier: 0,
    label: 0,
    missing: 0,
    duplicate: 0,
  };
  const missing: Record<string, number> = Object.fromEntries(
    dataset.features.map((f) => [f.id, 0]),
  );
  const groups = new Map<string, number>();
  let unlabelled = 0;
  for (const row of dataset.rows) {
    if (row.target === null) unlabelled++;
    else if (dataset.task !== 'regression')
      support[String(row.target)] = (support[String(row.target)] ?? 0) + 1;
    if (row.groupId) groups.set(row.groupId, (groups.get(row.groupId) ?? 0) + 1);
    for (const key of Object.keys(missing)) if (row.features[key] === null) missing[key]!++;
    for (const defect of row.annotation?.defects ?? []) defects[defect]++;
  }
  return {
    count: dataset.rows.length,
    support,
    defects,
    missing,
    unlabelled,
    duplicateGroups: [...groups.values()].filter((n) => n > 1).length,
  };
}
