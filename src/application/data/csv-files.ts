import Papa from 'papaparse';
import {
  DataError,
  type Cell,
  type Dataset,
  type FeatureSpec,
  type Sample,
  type Task,
} from '@/domain/data/types';
import { utf8Length } from '@/domain/data/integrity';
import { safeId, validTimestamp, validateDataset } from '@/domain/data/validation';
import { parseDecimal } from '@/shared/utils/decimal';
export const csvLimit = 16 * 1024 * 1024;
export type ColumnRole =
  'ignore' | 'numeric' | 'categorical' | 'target' | 'id' | 'group' | 'timestamp';
export interface ColumnMapping {
  name: string;
  role: ColumnRole;
}
export interface CsvIssue {
  row: number;
  column: string;
  code: 'columns' | 'numeric' | 'id' | 'timestamp' | 'cell';
}
export interface CsvPreview {
  headers: string[];
  rows: string[][];
}
export function previewCsv(text: string, delimiter: string): CsvPreview {
  if (utf8Length(text) > csvLimit) throw new DataError('LIMIT', 'CSV');
  if (![',', ';', '\t'].includes(delimiter)) throw new DataError('OPTIONS', 'delimiter');
  const result = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), {
    delimiter,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
  });
  if (result.errors.length) throw new DataError('SCHEMA', `CSV ${result.errors[0]!.row ?? 0}`);
  const headers = result.data[0];
  if (
    !headers?.length ||
    headers.length > 64 ||
    result.data.length - 1 > 10000 ||
    result.data.some((row) => row.some((c) => c.length > 4096))
  )
    throw new DataError('LIMIT', 'CSV');
  return { headers, rows: result.data.slice(1) };
}
export function mapCsv(
  preview: CsvPreview,
  mapping: ColumnMapping[],
  task: Task,
  decimal: '.' | ',',
  excludeInvalid: boolean,
): { dataset?: Dataset; issues: CsvIssue[]; excluded: number } {
  if (
    mapping.length !== preview.headers.length ||
    mapping.some(
      (m) =>
        !['ignore', 'numeric', 'categorical', 'target', 'id', 'group', 'timestamp'].includes(
          m.role,
        ),
    ) ||
    !['binary', 'multiclass', 'regression'].includes(task) ||
    !['.', ','].includes(decimal)
  )
    throw new DataError('SCHEMA', 'mapping');
  const used = mapping.filter((m) => m.role !== 'ignore');
  if (
    used.some((m) => !m.name.trim() || m.name.length > 4096) ||
    new Set(used.map((m) => m.name)).size !== used.length ||
    mapping.filter((m) => m.role === 'target').length !== 1 ||
    ['id', 'group', 'timestamp'].some((role) => mapping.filter((m) => m.role === role).length > 1)
  )
    throw new DataError('SCHEMA', 'mapping');
  const features: FeatureSpec[] = mapping.flatMap((m, i) =>
    m.role === 'numeric' || m.role === 'categorical'
      ? [{ id: `f-${i + 1}`, name: m.name, kind: m.role }]
      : [],
  );
  const issues: CsvIssue[] = [];
  const rows: Sample[] = [];
  const ids = new Set<string>();
  let excluded = 0;
  preview.rows.forEach((cells, index) => {
    const rowIssues: CsvIssue[] = [];
    const issue = (column: string, code: CsvIssue['code']) =>
      rowIssues.push({ row: index + 2, column, code });
    const row: Sample = { id: `csv-${index + 1}`, features: {}, target: null, origin: 'imported' };
    if (cells.length !== mapping.length) issue('*', 'columns');
    mapping.forEach((m, i) => {
      if (m.role === 'ignore') return;
      const text = cells[i] ?? '';
      let value: Cell = text === '' ? null : text;
      if ((m.role === 'numeric' || (m.role === 'target' && task === 'regression')) && text !== '') {
        const parsed = parseDecimal(text);
        if (!parsed.ok || text.includes(decimal === '.' ? ',' : '.')) {
          issue(m.name, 'numeric');
          value = null;
        } else value = parsed.value;
      }
      if (m.role === 'numeric' || m.role === 'categorical') row.features[`f-${i + 1}`] = value;
      else if (m.role === 'target') row.target = value;
      else if (m.role === 'id') {
        if (!safeId(text)) issue(m.name, 'id');
        else row.id = text;
      } else if (m.role === 'group' && text) {
        if (!safeId(text)) issue(m.name, 'id');
        else row.groupId = text;
      } else if (m.role === 'timestamp' && text) {
        if (!validTimestamp(text)) issue(m.name, 'timestamp');
        else row.timestamp = text;
      }
    });
    if (ids.has(row.id)) issue('id', 'id');
    if (rowIssues.length) {
      issues.push(...rowIssues);
      excluded++;
    } else {
      rows.push(row);
      ids.add(row.id);
    }
  });
  if (issues.length && !excludeInvalid) return { issues, excluded };
  const dataset: Dataset = {
    id: 'imported-csv',
    revision: 1,
    task,
    targetName: mapping.find((m) => m.role === 'target')!.name,
    features,
    rows,
    ...(task === 'regression'
      ? {}
      : {
          classOrder: [
            ...new Set(rows.filter((r) => r.target !== null).map((r) => String(r.target))),
          ],
        }),
  };
  validateDataset(dataset);
  return { dataset, issues, excluded };
}
export function exportDatasetCsv(
  dataset: Dataset,
  delimiter = ',',
): { text: string; protectedCount: number } {
  validateDataset(dataset);
  if (![',', ';', '\t'].includes(delimiter)) throw new DataError('OPTIONS', 'delimiter');
  if (dataset.features.length + 4 > 64) throw new DataError('LIMIT', 'columns');
  let protectedCount = 0;
  const protect = (value: Cell): Cell => {
    if (
      typeof value === 'string' &&
      (/^[=+\-@]/.test(value.trimStart()) || /^\s*[\t\r]/.test(value))
    ) {
      protectedCount++;
      return `'${value}`;
    }
    return value;
  };
  const headers = [
    'row:id',
    'row:group',
    'row:time',
    ...dataset.features.map((f) => `feature:${f.id}`),
    `target:${dataset.targetName}`,
  ];
  const data: Cell[][] = [
    headers,
    ...dataset.rows.map((r) =>
      [
        r.id,
        r.groupId ?? null,
        r.timestamp ?? null,
        ...dataset.features.map((f) => r.features[f.id]!),
        r.target,
      ].map(protect),
    ),
  ];
  const text = Papa.unparse(data, { delimiter, newline: '\r\n' });
  if (utf8Length(text) > csvLimit) throw new DataError('LIMIT', 'CSV');
  return { text, protectedCount };
}
