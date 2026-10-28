export interface ConceptControl {
  labId: string;
  controlId: string;
  label: string;
  path: string;
}
const groups: readonly [string, string, readonly [string, string][]][] = [
  [
    'L01',
    'datos',
    [
      ['recipe', 'Receta de datos'],
      ['noise', 'Ruido y defectos'],
      ['features', 'Features y derivadas'],
      ['split', 'Partición de datos'],
      ['scaling', 'Escalado train-only'],
      ['seed', 'Semilla de datos'],
    ],
  ],
  [
    'L02',
    'neurona',
    [
      ['input-x1', 'Entrada x₁'],
      ['bias', 'Sesgo'],
      ['weight-w1', 'Peso w₁'],
      ['activation', 'Función de activación'],
    ],
  ],
  [
    'L03',
    'arquitectura',
    [
      ['topology', 'Arquitectura y parámetros'],
      ['initialization', 'Inicialización de pesos'],
    ],
  ],
  [
    'L04',
    'activaciones',
    [
      ['activation-z', 'Activación y derivada en z'],
      ['activation-chain', 'Cadena de derivadas'],
    ],
  ],
  [
    'L05',
    'propagacion',
    [
      ['phase', 'Fases de forward/backward'],
      ['learning-rate', 'Tasa de una actualización'],
    ],
  ],
  [
    'L06',
    'entrenamiento',
    [
      ['learning-rate', 'Tasa de aprendizaje'],
      ['batch-size', 'Tamaño de lote'],
      ['optimizer', 'Optimizador'],
      ['epochs', 'Épocas'],
      ['scheduler', 'Programador de tasa'],
    ],
  ],
  [
    'L07',
    'optimizacion',
    [
      ['surface', 'Paisaje ilustrativo o corte real'],
      ['learning-rate', 'Tasa común'],
      ['clip', 'Clipping del gradiente'],
    ],
  ],
  [
    'L08',
    'generalizacion',
    [
      ['intervention', 'Intervención de regularización'],
      ['regularization', 'L1/L2'],
      ['early-stop', 'Parada temprana'],
      ['dropout', 'Dropout'],
      ['batch-normalization', 'Normalización por lotes'],
      ['capacity', 'Capacidad y tamaño de train'],
    ],
  ],
  [
    'L09',
    'clasificacion',
    [
      ['threshold', 'Umbral y costes'],
      ['positive-class', 'Clase positiva'],
      ['confusion-cell', 'Celdas de confusión'],
      ['costs', 'Costes de decisión'],
      ['calibration-bins', 'Bins de calibración'],
    ],
  ],
  [
    'L10',
    'regresion',
    [
      ['regression-model', 'Modelo y baseline'],
      ['residuals', 'Residuos'],
      ['function-width', 'Construir una función'],
    ],
  ],
  [
    'L11',
    'vision',
    [
      ['kernel', 'Pesos del kernel'],
      ['stride', 'Desplazamiento de ventana'],
      ['padding', 'Padding'],
      ['pixel', 'Pintura de píxeles'],
    ],
  ],
  [
    'L12',
    'experimentos',
    [
      ['comparison', 'Comparación controlada'],
      ['permutation', 'Importancia por permutación'],
      ['classical-k', 'Vecinos k'],
      ['classical-depth', 'Profundidad CART'],
      ['grid-plan', 'Plan y presupuesto de rejilla'],
      ['grid-selection', 'Selección entre intentos de rejilla'],
      ['cross-validation', 'Validación cruzada'],
      ['dispersion', 'Dispersión multisemilla'],
      ['shift', 'Cambio de distribución'],
      ['segments', 'Segmentos de optimización'],
    ],
  ],
  [
    'L13',
    'arquitectura/frontera',
    [
      ['dataset', 'Datos y ruido'],
      ['train', 'Entrenamiento visual'],
      ['network', 'Red y activaciones'],
    ],
  ],
  [
    'L14',
    'clasificacion/visual',
    [
      ['dataset', 'Clases y datos'],
      ['train', 'Entrenamiento visual'],
      ['network', 'Red multiclase'],
    ],
  ],
];
export const conceptControls: ConceptControl[] = groups.flatMap(([labId, slug, controls]) =>
  controls.map(([controlId, label]) => ({
    labId,
    controlId,
    label,
    path:
      '/lab/' +
      (labId === 'L12' && controlId === 'permutation'
        ? 'experimentos/importancia'
        : labId === 'L10' && controlId === 'function-width'
          ? 'regresion/funciones'
          : labId === 'L09' && controlId === 'costs'
            ? 'clasificacion/etica'
            : labId === 'L08' && controlId === 'capacity'
              ? 'generalizacion/capacidad'
              : labId === 'L12' && ['grid-plan', 'grid-selection'].includes(controlId)
                ? 'experimentos/rejilla'
                : labId === 'L12' && ['classical-k', 'classical-depth'].includes(controlId)
                  ? 'experimentos/clasicos'
                  : labId === 'L12' && controlId === 'segments'
                    ? 'entrenamiento'
                    : labId === 'L12' &&
                        ['cross-validation', 'shift', 'dispersion'].includes(controlId)
                      ? 'experimentos/robustez'
                      : slug),
  })),
);
export const coreCategories = [
  { id: 'data', title: 'Datos y representación' },
  { id: 'tasks', title: 'Tareas y fronteras' },
  { id: 'architecture', title: 'Arquitectura' },
  { id: 'activations', title: 'Activaciones' },
  { id: 'training', title: 'Flujo de entrenamiento' },
  { id: 'optimization', title: 'Pérdida y optimización' },
  { id: 'regularization', title: 'Generalización' },
  { id: 'evaluation', title: 'Evaluación' },
  { id: 'workflow', title: 'Método y reproducibilidad' },
  { id: 'methods', title: 'Métodos de comparación' },
  { id: 'ethics', title: 'Ética y contexto' },
  { id: 'interpretability', title: 'Representaciones e interpretación' },
];
