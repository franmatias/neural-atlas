import { modelLimit } from '@/application/training/inference-model';
export async function readModelFile(file: File): Promise<string> {
  if (file.size > modelLimit) throw new Error('MODEL_SIZE');
  return new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
}
export function downloadModel(text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'neural-atlas-model.json';
  try {
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
