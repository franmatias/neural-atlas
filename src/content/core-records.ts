import { concepts as original, type Concept } from './legacy-concepts';
import { extendedCoreSeeds } from './extended-core-concepts';
import { coreExamples } from './core-examples';
import { corePrerequisites } from './core-prerequisites';
import { conceptControls } from './concept-controls';
import { conceptSchema, type ConceptRecord } from '@/domain/content/concept';
const idOf = (n: number) => `C${String(n).padStart(3, '0')}`;
const clean = (text: string) =>
  text.replace(/([a-záéíóúñ])(?=\d)/gi, '$1 ').replace(/(\d)(?=[a-záéíóúñ])/gi, '$1 ');
const future = new Set<number>();
const overrides: Record<number, string> = {
  146: 'experimentos/importancia',
  143: 'experimentos/clasicos',
  144: 'experimentos/clasicos',
  145: 'experimentos/rejilla',
  151: 'experimentos/rejilla',
  22: 'arquitectura',
  31: 'activaciones',
  32: 'activaciones',
  33: 'activaciones',
  37: 'regresion/funciones',
  80: 'optimizacion',
};
function category(id: number) {
  return id <= 13 || id === 20 || (id >= 101 && id <= 119) || id === 133
    ? 'data'
    : id <= 19
      ? 'tasks'
      : id <= 38
        ? 'architecture'
        : id <= 47
          ? 'activations'
          : id <= 67
            ? 'training'
            : id <= 80
              ? 'optimization'
              : id <= 90
                ? 'regularization'
                : id <= 100 || (id >= 120 && id <= 132)
                  ? 'evaluation'
                  : (id >= 141 && id <= 146) || id === 151
                    ? 'methods'
                    : id === 147 || id === 148
                      ? 'ethics'
                      : id === 149 || id === 150
                        ? 'interpretability'
                        : 'workflow';
}
const limits: Record<string, string> = {
  data: 'Las transformaciones se ajustan con la información permitida y conservan la procedencia de las muestras.',
  tasks:
    'La decisión y su evaluación requieren una representación y un protocolo explícitos, sin deducir causalidad.',
  architecture:
    'La capacidad depende de la representación y no garantiza que el entrenamiento encuentre una solución útil.',
  activations:
    'Las dimensiones y las convenciones en puntos no diferenciables se explicitan al comparar funciones y derivadas.',
  training:
    'Registrar configuración, datos y contador permite distinguir el cálculo de su animación y repetir el procedimiento.',
  optimization:
    'Un paso observado no certifica un mínimo global ni una mejora del rendimiento fuera del entrenamiento.',
  regularization:
    'La intervención se contrasta con validación y condiciones comunes, manteniendo test fuera de la selección.',
  evaluation:
    'La métrica necesita población, denominador y convención; un valor aislado no justifica un uso real.',
  workflow:
    'La evidencia se interpreta con sus condiciones, sus fuentes de variación y sus límites de reproducción.',
  methods:
    'La explicación de consulta no activa un comparador futuro ni garantiza resultados fuera de sus supuestos.',
  ethics:
    'Los indicadores orientan preguntas y no sustituyen la participación, la validez de etiquetas ni el contexto.',
  interpretability:
    'Inspeccionar una asociación o contribución no establece por sí solo un efecto causal del sistema observado.',
};
const dimensions: Record<string, string> = {
  L01: 'Dataset X de N×d; objetivos y de N componentes; estadísticas por columna.',
  L02: 'x,w de dimensión 2; b,z,a escalares.',
  L03: 'W por capa de n_salida×n_entrada, b de n_salida; recuento de parámetros escalar.',
  L04: 'z y f(z) escalares; softmax opera sobre K logits y produce K probabilidades.',
  L05: 'Preset 2→2→1; cada gradiente tiene la forma del parámetro correspondiente.',
  L06: 'N muestras, d features, B muestras por lote; épocas y actualizaciones son contadores escalares.',
  L07: 'Dos coordenadas de parámetro, gradiente de dimensión 2 y coste escalar.',
  L08: 'Parámetros por capa; activaciones de lote B×n; pérdidas y normas escalares.',
  L09: 'Matriz K×K; recuentos escalares; probabilidad por clase y muestra.',
  L10: 'Entrada de d componentes y objetivo/predicción numéricos escalares; residuos de N componentes.',
  L11: 'Imagen N×N, kernel K×K y mapas O×O; productos y salida de ventana escalares.',
  L12: 'Datos N×d y resultados por ejecución; predicciones comparables sobre las mismas N muestras.',
  L13: 'Dos features y una salida binaria; mapa bidimensional.',
  L14: 'Dos features y K salidas multiclase; mapa bidimensional.',
};
const controls: Record<number, string> = {
  146: 'permutation',
  143: 'classical-k',
  144: 'classical-depth',
  145: 'grid-plan',
  151: 'grid-selection',
  1: 'features',
  2: 'features',
  3: 'split',
  4: 'split',
  5: 'split',
  6: 'split',
  7: 'scaling',
  8: 'scaling',
  9: 'noise',
  10: 'noise',
  12: 'features',
  17: 'bias',
  27: 'weight-w1',
  28: 'bias',
  31: 'activation-z',
  32: 'activation-z',
  33: 'activation-z',
  37: 'function-width',
  39: 'activation',
  41: 'activation',
  42: 'activation',
  43: 'activation',
  44: 'activation',
  45: 'activation-z',
  46: 'activation',
  47: 'activation',
  49: 'weight-w1',
  50: 'activation',
  51: 'epochs',
  52: 'batch-size',
  53: 'batch-size',
  54: 'epochs',
  55: 'optimizer',
  56: 'batch-size',
  57: 'batch-size',
  62: 'learning-rate',
  63: 'scheduler',
  64: 'surface',
  65: 'surface',
  66: 'surface',
  80: 'clip',
  85: 'regularization',
  86: 'regularization',
  87: 'dropout',
  88: 'early-stop',
  90: 'batch-normalization',
  91: 'confusion-cell',
  92: 'confusion-cell',
  93: 'confusion-cell',
  94: 'confusion-cell',
  95: 'confusion-cell',
  96: 'confusion-cell',
  97: 'confusion-cell',
  98: 'confusion-cell',
  99: 'confusion-cell',
  100: 'epochs',
  101: 'scaling',
  102: 'scaling',
  103: 'split',
  104: 'confusion-cell',
  105: 'split',
  106: 'split',
  107: 'split',
  108: 'cross-validation',
  83: 'dispersion',
  84: 'capacity',
  119: 'capacity',
  140: 'dispersion',
  110: 'seed',
  113: 'shift',
  114: 'shift',
  115: 'shift',
  117: 'features',
  118: 'features',
  120: 'calibration-bins',
  121: 'calibration-bins',
  122: 'threshold',
  123: 'threshold',
  124: 'threshold',
  125: 'threshold',
  126: 'threshold',
  127: 'costs',
  130: 'residuals',
  133: 'scaling',
  135: 'clip',
  139: 'cross-validation',
  147: 'costs',
  148: 'costs',
};
const presets: Record<number, string[]> = {
  22: ['failure-zero'],
  31: ['failure-zero'],
  43: ['failure-relu'],
  62: ['failure-rate'],
  78: ['failure-rate'],
  101: ['failure-leak'],
  102: [],
  104: ['failure-labels'],
  115: ['failure-units'],
  136: ['failure-output'],
  147: ['failure-labels'],
  148: ['failure-labels'],
  152: ['failure-rate', 'failure-bn', 'failure-output'],
};
const old = original.filter((c) => !c.reference);
const extra: Concept[] = extendedCoreSeeds.map(
  ([n, title, english, definition, formula, , , answer, lab]) => ({
    id: idOf(n),
    title,
    english,
    definition,
    formula,
    question: `¿Qué interpretación de «${title}» respeta sus condiciones?`,
    answer,
    lab,
    aliases: [],
  }),
);
const extraDetails = new Map(extendedCoreSeeds.map((s) => [s[0], { example: s[5], wrong: s[6] }]));
const sourceUrls: Record<string, string> = {
  data: 'https://scikit-learn.org/stable/modules/preprocessing.html',
  evaluation:
    'https://developers.google.com/machine-learning/crash-course/classification/accuracy-precision-recall',
  architecture:
    'https://developers.google.com/machine-learning/crash-course/neural-networks/nodes-hidden-layers',
  activations:
    'https://developers.google.com/machine-learning/crash-course/neural-networks/nodes-hidden-layers',
  optimization: 'https://d2l.ai/chapter_optimization/adam.html',
  workflow: 'https://scikit-learn.org/stable/modules/cross_validation.html',
  ethics: 'https://fairlearn.org/v0.13/user_guide/assessment/perform_fairness_assessment.html',
};
export const coreRecords: readonly ConceptRecord[] = [...old, ...extra]
  .sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }))
  .map((seed) => {
    const n = Number(seed.id.slice(1)),
      cat = category(n),
      detail = extraDetails.get(n),
      example = clean(detail?.example ?? coreExamples[n]![0]),
      wrong = detail?.wrong ?? coreExamples[n]![1],
      answer = seed.answer!;
    const slug = overrides[n] ?? seed.lab ?? 'neurona';
    const route =
      conceptControls.find((c) => c.path === '/lab/' + slug) ??
      conceptControls.find((c) => c.labId === 'L09')!;
    const control =
      conceptControls.find((c) => c.labId === route.labId && c.controlId === controls[n]) ?? route;
    const base = seed.definition.replace(
      'Su regla de aprendizaje llegará con L03.',
      'Su regla de aprendizaje se explora en L03.',
    );
    const limit =
      n === 146
        ? 'El cambio de pérdida describe este modelo y estas muestras; correlaciones y entradas artificiales limitan su interpretación causal.'
        : [145, 151].includes(n)
          ? 'El mejor resultado observado selecciona sobre validación; declarar todos los intentos no sustituye una evaluación independiente ni convierte la selección en causalidad.'
          : [143, 144].includes(n)
            ? 'La comparación usa el mismo train y validación con pipeline común; frecuencias y reglas no garantizan generalización ni calibración.'
            : limits[cat];
    let definition = `${base} ${answer} Ejemplo estático: ${example}`;
    if (definition.split(/\s+/).length > 80) definition = `${base} Ejemplo estático: ${example}`;
    if (definition.split(/\s+/).length < 40) definition += ' ' + limit;
    const prerequisites = (corePrerequisites[n] ?? []).map(idOf),
      related = [idOf(n === 152 ? 1 : n + 1)].filter(
        (id) => id !== seed.id && !prerequisites.includes(id),
      );
    const active = !future.has(n),
      activity = active
        ? `Abre ${control.label} en el laboratorio relacionado. Predice qué cambiará, realiza una intervención controlada e identifica un resultado que apoye o contradiga tu explicación.`
        : 'Consulta el ejemplo y justifica el procedimiento con sus supuestos. El comparador automático pertenece a X1 y no se presenta como disponible.';
    const options = [
      { id: 'correct', text: answer },
      { id: 'misconception', text: wrong },
    ];
    if (n % 2 === 0) options.reverse();
    return conceptSchema.parse({
      id: seed.id,
      slug: seed.title
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      contentVersion: [143, 144, 145, 146, 151].includes(n) ? 2 : 1,
      title: { es: seed.title, en: seed.english },
      aliases: { es: seed.aliases, en: [] },
      category: cat,
      level: n <= 54 ? 'introductory' : n <= 100 ? 'intermediate' : 'advanced',
      definition: { es: definition },
      intuition: { es: example, analogyLimit: limit },
      formal: {
        notation: seed.formula ?? 'Procedimiento y condiciones descritos en la ficha.',
        dimensions: dimensions[control.labId],
      },
      numericExample:
        n === 21
          ? {
              inputs: [0.8, 0.2],
              weights: [0.5, -0.3],
              bias: 0.1,
              z: 0.44,
              output: 0.6082590307465143,
              units: 'Sin unidad en este ejemplo.',
              snapshotBindings: ['selectedNeuron.preActivation', 'selectedNeuron.activation'],
            }
          : {
              values: { example },
              calculation: seed.formula ?? example,
              result: example,
              units: 'Según el ejemplo; adimensional salvo unidad indicada.',
              snapshotBindings: [],
            },
      relatedControls: active ? [{ labId: control.labId, controlId: control.controlId }] : [],
      frequentMistake: { es: wrong, correction: answer },
      misconceptionPresetIds: presets[n] ?? [],
      selfAssessment: {
        id: 'Q-' + seed.id,
        type: 'mcq',
        prompt: seed.question ?? `¿Qué interpretación de ${seed.title} es correcta?`,
        options,
        correctOptionIds: ['correct'],
        answer,
        explanation: answer + ' ' + example,
      },
      prerequisiteIds: prerequisites,
      relatedIds: related,
      labIds: [control.labId],
      activity,
      evidence: active
        ? `Registra el control modificado y el resultado numérico/visual observado. Contrasta con este ejemplo estático y explica por qué no permite concluir más de lo medido.`
        : 'Respuesta explicada y reconocimiento del alcance previsto; sin evidencia de un comparador implementado.',
      validationRefs: active ? ['P-' + control.labId] : [],
      sources: [
        {
          title: 'Referencia primaria para ampliar el tema',
          url: [145, 151].includes(n)
            ? 'https://scikit-learn.org/stable/modules/grid_search.html'
            : n === 146
              ? 'https://scikit-learn.org/stable/modules/permutation_importance.html'
              : n === 143
                ? 'https://scikit-learn.org/stable/modules/neighbors.html'
                : n === 144
                  ? 'https://scikit-learn.org/stable/modules/tree.html'
                  : (sourceUrls[cat] ?? sourceUrls.workflow),
        },
      ],
      targetRelease:
        n === 146 ? '1.3' : [143, 144, 145, 146, 151].includes(n) ? '1.2' : active ? '1.1' : '1.2',
      status: active ? 'implemented' : 'specified',
    });
  });
