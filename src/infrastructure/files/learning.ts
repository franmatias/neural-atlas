export function downloadLearning(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  try {
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
export async function readLearning(file: File, limitMiB: number) {
  if (file.size > limitMiB * 1024 * 1024) throw Error('El archivo supera ' + limitMiB + ' MiB.');
  return new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
}
