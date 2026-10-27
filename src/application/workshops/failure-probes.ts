import type { WorkshopOptions, WorkshopEvidence } from './contracts';
import { prepareExperiment, type Experiment } from '@/application/training/experiment';
import { validateTraining } from '@/domain/training/session';
import { cloneNetwork, forward } from '@/domain/network/model';
export function inspectFailure(
  fault: NonNullable<WorkshopOptions['advanced']>['fault'],
  experiment: Experiment,
): Pick<WorkshopEvidence, 'metrics' | 'rows' | 'columns'> {
  const prepared = prepareExperiment(experiment),
    source = prepared.source.input;
  const metrics: WorkshopEvidence['metrics'] = {
    repairPreservesSplit: true,
    originalUnchanged: true,
    testConsulted: false,
  };
  if (fault === 'output' || fault === 'bn') {
    const config =
      fault === 'bn'
        ? { ...source.config, batchSize: 1 }
        : {
            ...source.config,
            spec: { ...source.config.spec, task: 'multiclass' as const, classes: 3 },
          };
    let rejection = '';
    try {
      validateTraining({ ...source, config });
    } catch (error) {
      rejection = error instanceof Error ? error.message : 'VALIDATION_ERROR';
    }
    return {
      metrics: { ...metrics, validationRejected: !!rejection, faultChanged: !!rejection },
      columns: ['Configuración', 'Resultado del validador', 'Ejecución'],
      rows: [
        {
          label: fault === 'bn' ? 'BN con lote uno' : 'Salida 3 con objetivo binario',
          values: [rejection || 'Aceptada', 'No se ejecuta propuesta inválida'],
        },
        { label: 'Reparación válida', values: ['Aceptada', 'Entrenada y exportable'] },
      ],
    };
  }
  if (fault === 'leak') {
    const train = [0, 1, 2],
      holdout = [100],
      probe = 2,
      good = probe / Math.max(...train),
      bad = probe / Math.max(...train, ...holdout);
    return {
      metrics: { ...metrics, faultChanged: good !== bad, illustrativeHoldoutConsulted: true },
      columns: [
        'Ejemplo deliberadamente incorrecto, independiente del modelo',
        'Máximo usado',
        'Valor transformado de 2',
      ],
      rows: [
        { label: 'Correcto: train [0,1,2]', values: [Math.max(...train), good] },
        {
          label: 'Fuga: incluye holdout ficticio [100]',
          values: [Math.max(...train, ...holdout), bad],
        },
      ],
    };
  }
  if (fault === 'labels') {
    const altered = source.train.y.map((y, i) => (i % 5 === 0 ? 1 - y : y)),
      changes = altered.filter((y, i) => y !== source.train.y[i]).length;
    return {
      metrics: { ...metrics, faultChanged: changes > 0 },
      columns: ['Sonda train, copia y oráculo sintético', 'Filas', 'Discrepancias con el oráculo'],
      rows: [
        { label: 'Etiquetas de referencia', values: [source.train.ids.length, 0] },
        { label: 'Una de cada cinco etiquetas alterada', values: [altered.length, changes] },
        {
          label: 'Reparación con oráculo conocido solo en el ejercicio',
          values: [source.train.ids.length, 0],
        },
      ],
    };
  }
  if (fault === 'relu') {
    const copy = cloneNetwork(experiment.checkpoint.model);
    copy.layers[0]!.biases.fill(-100);
    const zeros = (model: typeof copy) =>
      source.train.x.reduce(
        (sum, x) =>
          sum + Array.from(forward(model, x).activations[1]!).filter((v) => v === 0).length,
        0,
      );
    const good = zeros(experiment.checkpoint.model),
      bad = zeros(copy),
      total = source.train.x.length * copy.layers[0]!.outputs;
    return {
      metrics: { ...metrics, faultChanged: good !== bad },
      columns: [
        'Sonda train, primera capa ReLU',
        'Activaciones cero',
        'Activaciones inspeccionadas',
      ],
      rows: [
        { label: 'Sesgos originales / restaurados', values: [good, total] },
        { label: 'Copia con sesgos −100', values: [bad, total] },
      ],
    };
  }
  throw Error('FAILURE_PROBE');
}
