import irisRaw from '@/content/datasets/raw/bezdekIris.data?raw';
import wineRaw from '@/content/datasets/raw/wine.data?raw';
import provenance from '@/content/datasets/provenance.json';
import { hashText } from '@/domain/data/integrity';
import { validateDataset } from '@/domain/data/validation';
import type { Dataset } from '@/domain/data/types';
export const realDatasetCards = [
  {
    id: 'iris',
    title: 'Iris · cuatro medidas de flores',
    rows: 150,
    features: 4,
    creator: 'R. A. Fisher (1936)',
    doi: 'https://doi.org/10.24432/C56C76',
    source: 'https://archive.ics.uci.edu/dataset/53/iris',
    file: 'bezdekIris.data',
    note: '150 flores y tres especies. Se usa la versión que incorpora las correcciones de las muestras 35 y 38 indicadas por UCI.',
  },
  {
    id: 'wine',
    title: 'Wine · trece medidas químicas',
    rows: 178,
    features: 13,
    creator: 'S. Aeberhard y M. Forina (1992)',
    doi: 'https://doi.org/10.24432/C5PC7J',
    source: 'https://archive.ics.uci.edu/dataset/109/wine',
    file: 'wine.data',
    note: '178 muestras de tres cultivares de una región italiana. Las escalas de las trece variables son diferentes; la proyección 2D no las representa todas.',
  },
] as const;
export type RealDatasetId = (typeof realDatasetCards)[number]['id'];
const irisNames = [
  'Longitud del sépalo',
  'Anchura del sépalo',
  'Longitud del pétalo',
  'Anchura del pétalo',
];
const wineNames = [
  'Alcohol',
  'Ácido málico',
  'Cenizas',
  'Alcalinidad de las cenizas',
  'Magnesio',
  'Fenoles totales',
  'Flavanoides',
  'Fenoles no flavanoides',
  'Proantocianinas',
  'Intensidad de color',
  'Tonalidad',
  'OD280/OD315 de vinos diluidos',
  'Prolina',
];
export function realDataset(id: RealDatasetId): Dataset {
  const card = realDatasetCards.find((c) => c.id === id);
  if (!card) throw Error('REAL_DATASET_ID');
  const raw = id === 'iris' ? irisRaw : wineRaw;
  if (hashText(raw) !== provenance.hashes[card.file]) throw Error('REAL_DATASET_INTEGRITY');
  const names = id === 'iris' ? irisNames : wineNames;
  const features = names.map((name, i) => ({
    id: `feature-${i + 1}`,
    name,
    kind: 'numeric' as const,
    ...(id === 'iris' ? { unit: 'cm' } : {}),
  }));
  const rows = raw
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      const cells = line.split(',');
      if (cells.length !== names.length + 1) throw Error('REAL_DATASET_SHAPE');
      const values = (id === 'iris' ? cells.slice(0, -1) : cells.slice(1)).map(Number);
      if (values.some((v) => !Number.isFinite(v))) throw Error('REAL_DATASET_VALUES');
      return {
        id: `${id}-${String(index + 1).padStart(3, '0')}`,
        origin: 'imported' as const,
        features: Object.fromEntries(features.map((f, i) => [f.id, values[i]!])),
        target: id === 'iris' ? cells.at(-1)! : cells[0]!,
      };
    });
  if (rows.length !== card.rows) throw Error('REAL_DATASET_ROWS');
  const dataset: Dataset = {
    id: `uci-${id}-v1`,
    revision: 1,
    task: 'multiclass',
    features,
    targetName: id === 'iris' ? 'Especie de iris' : 'Cultivar',
    classOrder:
      id === 'iris' ? ['Iris-setosa', 'Iris-versicolor', 'Iris-virginica'] : ['1', '2', '3'],
    rows,
  };
  validateDataset(dataset);
  return dataset;
}
export { provenance as realDatasetProvenance };
