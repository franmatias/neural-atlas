import { DataError, type Dataset, type Sample } from './types';
import { validateDataset } from './validation';
export type DatasetEdit =
  { type: 'replace'; row: Sample } | { type: 'add'; row: Sample } | { type: 'remove'; id: string };
export function editDataset(dataset: Dataset, edit: DatasetEdit): Dataset {
  const id = edit.type === 'remove' ? edit.id : edit.row.id;
  const exists = dataset.rows.some((row) => row.id === id);
  if (edit.type === 'add' ? exists : !exists) throw new DataError('SCHEMA', id);
  const rows =
    edit.type === 'remove'
      ? dataset.rows.filter((row) => row.id !== id)
      : edit.type === 'add'
        ? [...dataset.rows, edit.row]
        : dataset.rows.map((row) => (row.id === id ? edit.row : row));
  const next: Dataset = { ...dataset, revision: dataset.revision + 1, rows };
  // A recipe records provenance, but manual changes mean it no longer reconstructs this revision.
  validateDataset(next);
  return next;
}
