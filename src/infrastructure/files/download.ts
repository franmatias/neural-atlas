import { DataError } from '@/domain/data/types';
export async function readDatasetFile(
  file: File,
): Promise<{ text: string; format: 'csv' | 'json' }> {
  const format = file.name.toLowerCase().endsWith('.json')
    ? 'json'
    : file.name.toLowerCase().endsWith('.csv')
      ? 'csv'
      : undefined;
  if (!format) throw new DataError('SCHEMA', 'CSV / JSON');
  if (file.size > (format === 'csv' ? 16 : 32) * 1024 * 1024)
    throw new DataError('LIMIT', file.name);
  try {
    const bytes = await file.arrayBuffer();
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), format };
  } catch {
    throw new DataError('SCHEMA', 'UTF-8');
  }
}
export function downloadDataset(text: string, format: 'csv' | 'json') {
  const url = URL.createObjectURL(
    new Blob([text], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `neural-atlas-dataset.${format}`;
  try {
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
