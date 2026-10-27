import { workshops } from '@/content/workshops';
import type { TeachingPack } from '@/application/content/teaching-packs';
import { generateDataset } from '@/domain/data/generate';
import { defaultGenerator } from '@/domain/data/types';
import { exportDatasetJson } from '@/application/data/json-files';
export function teachingExample(): TeachingPack {
  return {
    format: 'neural-atlas.teaching-pack',
    schemaVersion: 1,
    packId: 'unidad-test',
    version: '1.0.0',
    title: 'Unidad test',
    guide: {
      objectives: ['Formular hipótesis.'],
      prerequisites: [],
      minutes: 60,
      steps: ['Investigar y contrastar.'],
      errors: [],
      debate: [],
      accessibility: 'Tablas y teclado.',
      attribution: 'Datos sintéticos Neural Atlas.',
    },
    workshops: [structuredClone(workshops[0]!)],
    datasets: [
      {
        id: 'datos',
        file: JSON.parse(
          exportDatasetJson(generateDataset({ ...defaultGenerator, recipe: 'xor', count: 40 })),
        ) as unknown,
      },
    ],
    presets: [],
    links: [{ workshopId: workshops[0]!.id, datasetId: 'datos' }],
  };
}
