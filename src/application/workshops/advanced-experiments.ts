import { advancedWorkshopDefaults, type WorkshopEvidence, type WorkshopOptions } from './contracts';
import {
  compareGeneralization,
  defaultGeneralization,
  type GeneralizationRun,
} from '@/application/training/generalization';
import {
  generateAuditCohort,
  defaultAuditScenario,
  defaultAuditSettings,
  analyzeAudit,
} from '@/application/training/group-audit';
import { illustrativeSurface, traceSurface } from '@/domain/training/landscape';
import { generateDataset } from '@/domain/data/generate';
import { defaultGenerator } from '@/domain/data/types';
import { splitDataset } from '@/domain/data/split';
import { fitPipeline, transformRow } from '@/domain/data/pipeline';
import { profileDataset } from '@/domain/data/profile';
import { defaultSpec, forward } from '@/domain/network/model';
import { defaultOptimizer } from '@/domain/training/optimizer';
import { trainStudyRun } from '@/application/training/study-run';
import { exportExperiment, prepareExperiment } from '@/application/training/experiment';
import { hashValue } from '@/domain/data/integrity';
import { regressionMetrics } from '@/domain/training/metrics';
import { inspectFailure } from './failure-probes';
type Evidence = Pick<WorkshopEvidence, 'metrics' | 'rows' | 'columns' | 'curves' | 'experiment'>;
function trainingRows(runs: GeneralizationRun[]): Evidence {
  const last = runs.map((r) => r.experiment.checkpoint.history.at(-1)!);
  const scores = runs.map((r, i) => {
    if (r.experiment.config.spec.task !== 'regression') return last[i]!.validationScore;
    const samples = prepareExperiment(r.experiment).source.input.validation;
    return regressionMetrics(
      samples.y,
      samples.x.map((x) => forward(r.experiment.checkpoint.model, x).activations.at(-1)![0]!),
      r.experiment.checkpoint.baseline,
    ).r2;
  });
  return {
    metrics: {
      runCount: runs.length,
      recordedRuns: runs.length,
      baselineLoss: last[0]!.validationLoss,
      baselineScore: scores[0]!,
      ...(runs.length > 1
        ? { variantLoss: last.at(-1)!.validationLoss, variantScore: scores.at(-1)! }
        : {}),
      testConsulted: false,
    },
    columns: [
      'Ensayo',
      'Pérdida train',
      'Pérdida validación',
      'Score validación',
      'Norma de pesos',
      'Actualizaciones',
    ],
    rows: runs.map((r, i) => ({
      label: r.label,
      values: [
        last[i]!.trainLoss,
        last[i]!.validationLoss,
        scores[i] ?? 'No definida',
        r.weightNorm,
        r.experiment.checkpoint.updates,
      ],
    })),
    curves: runs.map((r) => ({
      label: r.label,
      scoreKind: r.experiment.config.spec.task === 'regression' ? 'mse' : 'accuracy',
      rate: r.experiment.config.optimizer.rate,
      batch: r.experiment.config.batchSize,
      outcome: 'finite',
      updates: r.experiment.checkpoint.updates,
      history: r.experiment.checkpoint.history,
    })),
  };
}
export function runAdvancedWorkshop(
  caseId: WorkshopEvidence['caseId'],
  options: WorkshopOptions,
): Evidence {
  const a = options.advanced ?? advancedWorkshopDefaults;
  if (['T06', 'T08', 'T09', 'T12'].includes(caseId) && !options.budgetAccepted)
    throw Error('WORKSHOP_BUDGET');
  if (caseId === 'T06') {
    const result = compareGeneralization({
      ...defaultGeneralization,
      seed: options.seed,
      epochs: options.epochs,
      noise: a.noise,
      intervention: 'l2',
      lambda: a.lambda,
    });
    const evidence = trainingRows(result.runs);
    evidence.metrics = {
      ...evidence.metrics,
      baselineNorm: result.runs[0]!.weightNorm,
      variantNorm: result.runs[1]!.weightNorm,
      trainSupport: result.counts.train,
      validationSupport: result.counts.validation,
      repairPreservesSplit:
        hashValue(result.runs[0]!.experiment.dataset) ===
        hashValue(result.runs[1]!.experiment.dataset),
      originalUnchanged: result.runs[0]!.initialHash === result.runs[1]!.initialHash,
    };
    return evidence;
  }
  if (caseId === 'T07' || caseId === 'T11') {
    const cohort = generateAuditCohort({ ...defaultAuditScenario, seed: options.seed }),
      settings = defaultAuditSettings();
    settings.alternative = a.threshold;
    const result = analyzeAudit(cohort, settings),
      r = result.reference.overall,
      v = result.alternative.overall;
    return {
      metrics: {
        baselineScore: r.accuracy,
        variantScore: v.accuracy,
        threshold: a.threshold,
        fp: v.fp,
        fn: v.fn,
        cost: v.totalCost,
        groupRecallGap: result.alternative.gaps.recall,
        testConsulted: false,
        originalUnchanged: true,
      },
      columns: ['Política/canal', 'N', 'TP', 'FP', 'TN', 'FN', 'Recall = TP/P', 'Coste'],
      rows: [
        {
          label: 'Referencia · agregado',
          values: [
            r.n,
            r.tp,
            r.fp,
            r.tn,
            r.fn,
            `${r.tp}/${r.positives} = ${r.recall ?? 'No definida'}`,
            r.totalCost,
          ],
        },
        {
          label: 'Alternativa · agregado',
          values: [
            v.n,
            v.tp,
            v.fp,
            v.tn,
            v.fn,
            `${v.tp}/${v.positives} = ${v.recall ?? 'No definida'}`,
            v.totalCost,
          ],
        },
        ...(['G1', 'G2'] as const).map((g) => {
          const m = result.alternative.groups[g];
          return {
            label: `Alternativa · ${g}`,
            values: [
              m.n,
              m.tp,
              m.fp,
              m.tn,
              m.fn,
              `${m.tp}/${m.positives} = ${m.recall ?? 'No definida'}`,
              m.totalCost,
            ],
          };
        }),
      ],
      curves: [],
    };
  }
  if (caseId === 'T09') {
    const dataset = generateDataset({
        ...defaultGenerator,
        seed: options.seed,
        count: 120,
        missing: 0.15,
        outliers: 0.08,
        duplicates: 0.08,
        noise: a.noise,
      }),
      before = hashValue(dataset),
      profile = profileDataset(dataset);
    const split = splitDataset(dataset, {
      strategy: 'stratified-grouped',
      seed: options.seed,
      ratios: [0.6, 0.2, 0.2],
    });
    const pipeline = fitPipeline(dataset, split, {
        featureIds: dataset.features.map((f) => f.id),
        imputation: 'median',
        scaling: options.scaling,
        missingIndicators: true,
      }),
      matrix = dataset.rows.map((r) => transformRow(r, pipeline));
    return {
      metrics: {
        nonFinite: matrix.flat().filter((v) => !Number.isFinite(v)).length,
        fittedTrain:
          pipeline.fittedOn.split === 'train' &&
          pipeline.fittedOn.idsHash === hashValue(split.train),
        trainSupport: split.train.length,
        validationSupport: split.validation.length,
        originalUnchanged: before === hashValue(dataset),
        testConsulted: false,
      },
      columns: ['Evidencia', 'Recuento / condición'],
      rows: [
        { label: 'Filas registradas', values: [dataset.rows.length] },
        {
          label: 'Ausencias en features antes',
          values: [Object.values(profile.missing).reduce((s, v) => s + v, 0)],
        },
        { label: 'Filas con outlier', values: [profile.defects.outlier] },
        {
          label: 'Filas duplicadas / grupos protegidos',
          values: [`${profile.defects.duplicate} filas / ${profile.duplicateGroups} grupos`],
        },
        {
          label: 'No finitos después de transformar',
          values: [matrix.flat().filter((v) => !Number.isFinite(v)).length],
        },
        { label: 'Estadísticas ajustadas con train', values: [pipeline.fittedOn.idsHash] },
      ],
      curves: [],
    };
  }
  if (caseId === 'T10') {
    const surface = illustrativeSurface('rosenbrock'),
      paths = [0, a.clipNorm].map((clip) =>
        traceSurface(surface, [-2, 2, -2, 2], [-1.2, 1], 'sgd', options.rate, options.epochs, clip),
      );
    return {
      metrics: {
        baselineLoss: paths[0]!.points.at(-1)!.loss,
        variantLoss: paths[1]!.points.at(-1)!.loss,
        baselineNorm: paths[0]!.points[0]!.norm,
        variantNorm: Math.hypot(...paths[1]!.points[0]!.applied),
        originalUnchanged: true,
        testConsulted: false,
      },
      columns: [
        'Ensayo ilustrativo',
        'Último coste finito',
        'Norma original inicial',
        'Norma aplicada inicial',
        'Puntos finitos',
        'Parada',
      ],
      rows: paths.map((p, i) => ({
        label: i ? 'Clipping' : 'Sin clipping',
        values: [
          p.points.at(-1)!.loss,
          p.points[0]!.norm,
          Math.hypot(...p.points[0]!.applied),
          p.points.length,
          p.status,
        ],
      })),
      curves: [],
    };
  }
  if (caseId === 'T08' || caseId === 'T12') {
    const dataset = generateDataset({
        ...defaultGenerator,
        recipe: caseId === 'T08' ? 'sine' : 'moons',
        count: 120,
        seed: options.seed,
        noise: a.noise,
      }),
      before = hashValue(dataset),
      split = splitDataset(dataset, {
        strategy: caseId === 'T08' ? 'random' : 'stratified',
        seed: options.seed,
        ratios: [0.6, 0.2, 0.2],
      });
    const config = {
      spec: {
        ...defaultSpec,
        hidden: [8, 8],
        task: dataset.task,
        activation: caseId==='T12' && a.fault === 'relu' ? ('relu' as const) : defaultSpec.activation,
        ...(caseId==='T12' && a.fault === 'bn' ? { batchNormalization: true as const } : {}),
      },
      seed: options.seed,
      initialization: 'xavier' as const,
      optimizer: {
        ...defaultOptimizer,
        kind: caseId === 'T12' && a.fault === 'rate' ? ('sgd' as const) : defaultOptimizer.kind,
      },
      epochs: options.epochs + 1,
      batchSize: 12,
      loss: 'mse' as const,
    };
    const runtimeBudget = {
      kind: 'updates' as const,
      limit: Math.ceil(split.train.length / 12) * options.epochs,
    };
    const repaired = trainStudyRun(
      dataset,
      split,
      config,
      'Referencia válida / reparación',
      undefined,
      false,
      runtimeBudget,
    );
    const registered = prepareExperiment(repaired.experiment);
    const evidence = trainingRows([repaired]);
    evidence.experiment = exportExperiment(repaired.experiment);
    evidence.metrics = {
      ...evidence.metrics,
      trainSupport: split.train.length,
      validationSupport: split.validation.length,
      fittedTrain: registered.prepared.pipeline.fittedOn.idsHash === hashValue(split.train),
      originalUnchanged: before === hashValue(dataset),
      ...(caseId === 'T08'
        ? {
            baselineReferenceLoss: split.validation.reduce(
              (sum, id) =>
                sum +
                (Number(dataset.rows.find((r) => r.id === id)!.target) -
                  repaired.experiment.checkpoint.baseline) **
                  2 /
                  split.validation.length,
              0,
            ),
          }
        : {}),
    };
    if (caseId === 'T12') {
      if (['leak', 'output', 'bn', 'labels', 'relu'].includes(a.fault)) {
        const probe = inspectFailure(a.fault, repaired.experiment);
        evidence.columns = probe.columns;
        evidence.rows = probe.rows;
        evidence.metrics = { ...evidence.metrics, ...probe.metrics };
      } else if (a.fault === 'units') {
        const model = repaired.experiment.checkpoint.model,
          input = prepareExperiment(repaired.experiment).prepared.pipeline,
          probe = dataset.rows.find((r) => r.id === split.train[0])!,
          correct = transformRow(probe, input),
          wrong = correct.map((v) => v * 1000),
          good = forward(model, correct).activations.at(-1)![0]!,
          bad = forward(model, wrong).activations.at(-1)![0]!;
        evidence.columns = [
          'Sonda train · modelo fijo',
          'Predicción de clase 1',
          'Condición de entrada',
        ];
        evidence.rows = [
          { label: 'Uso correcto', values: [good, 'Pipeline conservado'] },
          {
            label: 'Uso incorrecto',
            values: [bad, 'Entrada transformada multiplicada por 1000; modelo idéntico'],
          },
        ];
        evidence.metrics.faultChanged = Math.abs(good - bad) > 1e-12;
        evidence.metrics.repairPreservesSplit = true;
      } else {
        const fault = trainStudyRun(
          dataset,
          split,
          {
            ...config,
            initialization: a.fault === 'zero' ? 'zero' : 'xavier',
            optimizer: {
              ...defaultOptimizer,
              kind: a.fault === 'rate' ? 'sgd' : 'adam',
              rate: a.fault === 'rate' ? 1 : 0.01,
            },
          },
          a.fault === 'zero' ? 'Fallo: inicialización cero' : 'Fallo: tasa 1 (SGD en ambos)',
          undefined,
          false,
          runtimeBudget,
        );
        const compared = trainingRows([fault, repaired]);
        evidence.rows = compared.rows;
        evidence.curves = compared.curves;
        evidence.metrics = {
          ...evidence.metrics,
          ...compared.metrics,
          faultChanged:
            Math.abs(
              (compared.metrics.baselineLoss as number) - (compared.metrics.variantLoss as number),
            ) > 1e-12,
          repairPreservesSplit:
            hashValue(fault.experiment.dataset) === hashValue(repaired.experiment.dataset),
        };
      }
    }
    return evidence;
  }
  throw Error('WORKSHOP_CASE');
}
