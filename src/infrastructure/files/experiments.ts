import {
  exportExperiment,
  importExperiment,
  experimentLimit,
  type Experiment,
} from '@/application/training/experiment';
export async function readExperimentFile(file: File): Promise<Experiment> {
  if (file.size > experimentLimit) throw new Error('EXPERIMENT_SIZE');
  return importExperiment(
    new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()),
  );
}
export function downloadExperiment(snapshot: Experiment) {
  const text = exportExperiment(snapshot);
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'neural-atlas-experiment.json';
  try {
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
