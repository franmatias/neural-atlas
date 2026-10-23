export async function readWorkshopFile(file: File): Promise<string> {
  if (file.size > 1024 * 1024) throw new Error('WORKSHOP_SIZE');
  return new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
}
export function downloadWorkshopText(text: string, kind: 'workshop' | 'learning-evidence') {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `neural-atlas-${kind}.json`;
  try {
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
