import {
  definitionSchema,
  type WorkshopDefinition,
  type EvidenceRule,
} from '@/application/workshops/contracts';
import { advancedWorkshopSpecs } from './advanced-workshops';
export interface WorkshopSpec {
  id: WorkshopDefinition['caseId'];
  title: string;
  question: string;
  configuration: string;
  observation: string;
  explanation: string;
  hint: string;
  solution: string;
  rules: EvidenceRule[];
  lab: string;
  prerequisites?: string[];
  minutes?: number;
}
const specs: WorkshopSpec[] = [
  {
    id: 'T01',
    title: 'Datos honestos',
    question:
      'Antes de transformar: ¿qué ocurriría si calculases el escalado con filas de test? Predice además qué pasará con las ausencias.',
    configuration:
      'Elige semilla y escalado. El caso contiene dos sensores sintéticos con escalas distintas, valores ausentes y outliers.',
    observation:
      'Relaciona particiones disjuntas, ajuste exclusivo con train y número de no finitos con tu predicción. ¿Qué evidencia cambiaría tu opinión?',
    explanation:
      'Explica por qué usar test para ajustar min/max o imputaciones produce fuga, aunque no cambies ninguna etiqueta.',
    hint: 'Separar filas y aprender el transformador son dos operaciones diferentes. Los valores extremos de test no deben influir en las estadísticas de train.',
    solution:
      'El split separa filas. Imputaciones, media/desviación o min/max se aprenden después solo con train; validación y test se transforman con esos valores. Ajustar con test incorpora información de una evaluación que debería permanecer independiente.',
    rules: [
      { operator: 'splitDisjoint' },
      { operator: 'equals', metric: 'fittedTrain', value: true },
      { operator: 'equals', metric: 'nonFinite', value: 0 },
    ],
    lab: '/lab/datos',
  },
  {
    id: 'T02',
    title: 'Mover una frontera',
    question:
      'Con w₁ = 1 y w₂ = 0,5, predice qué cambiará al mover solo el sesgo desde cero. ¿Cambiará también la orientación?',
    configuration:
      'Elige un sesgo distinto de cero. Los dos pesos se mantienen fijos para aislar el efecto del sesgo.',
    observation:
      'Compara las rectas antes/después y su distancia perpendicular con tu predicción. Describe qué se conserva y qué cambia.',
    explanation:
      'Explica la diferencia entre modificar un peso y modificar el sesgo. Incluye la ecuación de la frontera y una limitación de la analogía.',
    hint: 'La normal de la recta es el vector de pesos. El término independiente desplaza una recta cuando su normal no cambia.',
    solution:
      'En w·x+b=0, mantener w fija conserva la normal y por tanto la orientación. Cambiar b desplaza la recta una distancia |Δb|/||w||. Cambiar un peso puede girar la normal y modificar la escala; no equivale a desplazar siempre la misma frontera.',
    rules: [
      { operator: 'changed', before: 'biasBefore', after: 'biasAfter' },
      { operator: 'equals', metric: 'sameWeights', value: true },
      { operator: 'range', metric: 'distance', min: 0.000001, max: 2 },
    ],
    lab: '/lab/neurona',
  },
  {
    id: 'T03',
    title: 'Resolver XOR',
    question:
      'Predice cuántos de los cuatro puntos XOR puede separar una única recta y qué aportan dos unidades ReLU.',
    configuration:
      'Elige semilla para entrenar el perceptrón. Después se contrasta con una construcción explícita 2→2→1; no se presenta como una red aprendida.',
    observation:
      'Compara el mejor perceptrón de esta ejecución, el ejemplo lineal de 3/4 y la construcción multicapa de 4/4.',
    explanation:
      'Explica por qué la composición de regiones no lineales resuelve XOR y por qué añadir capas lineales no produciría ese mismo efecto.',
    hint: 'Los positivos ocupan esquinas opuestas. La construcción calcula ReLU(x₁−x₂)+ReLU(x₂−x₁) en las cuatro entradas binarias.',
    solution:
      'Una recta no puede separar las dos parejas opuestas de XOR; existe un ejemplo lineal con 3/4 aciertos. En las entradas binarias, dos ReLU y una salida lineal construyen |x₁−x₂|, que da 0,1,1,0. Es una construcción exacta, no una garantía de que cualquier entrenamiento converja.',
    rules: [
      { operator: 'range', metric: 'linearCorrect', min: 0, max: 3 },
      { operator: 'equals', metric: 'linearExample', value: 3 },
      { operator: 'equals', metric: 'mlpCorrect', value: 4 },
    ],
    lab: '/lab/arquitectura',
  },
  {
    id: 'T04',
    title: 'Seguir el error',
    question:
      'Predice el signo de la actualización de un peso cuyo gradiente sea positivo. ¿Qué efecto tendrá aumentar la tasa?',
    configuration:
      'Elige una tasa. Se usa una microred 2→2→1 con una sola muestra y se aplica exactamente una actualización de gradiente.',
    observation:
      'Compara gradientes analíticos y diferencias centrales; contrasta pérdidas antes y después y el cambio de un peso.',
    explanation:
      'Explica el signo de Δw = −η∂L/∂w, el papel de la regla de la cadena y por qué un paso mayor no garantiza una pérdida menor.',
    hint: 'La derivada describe variación local. Una diferencia central usa perturbaciones positivas y negativas; comprueba tolerancia sin confundirla con una demostración simbólica.',
    solution:
      'Con gradiente positivo y η>0 el peso disminuye. Backprop aplica la regla de la cadena; las diferencias centrales contrastan el cálculo con pequeñas perturbaciones. El paso solo aproxima un descenso local y una tasa grande puede sobrepasar una región útil.',
    rules: [
      { operator: 'equals', metric: 'gradientPass', value: true },
      { operator: 'equals', metric: 'updateApplied', value: true },
      { operator: 'finite', metrics: ['lossBefore', 'lossAfter', 'gradientError'] },
    ],
    lab: '/lab/propagacion',
  },
  {
    id: 'T05',
    title: 'Ritmo de aprendizaje',
    question:
      'Predice cómo afectarán tres tasas y dos tamaños de lote a las curvas. Distingue esos cambios de acelerar la animación.',
    configuration:
      'Elige tres tasas distintas, dos lotes distintos y 5–20 épocas. Reconoce el presupuesto de seis ensayos antes de ejecutar.',
    observation:
      'Compara los seis ensayos con la misma semilla/datos/inicialización. Registra resultados finitos o divergencia; contrasta tu hipótesis sin elegir con test.',
    explanation:
      'Distingue tasa, tamaño del lote y velocidad visual. Explica qué comparaciones aíslan cada factor y por qué una sola semilla no demuestra una regla universal.',
    hint: 'Compara tasas manteniendo el lote fijo y lotes manteniendo la tasa fija. La velocidad de reproducción no pertenece a la ecuación de actualización.',
    solution:
      'La tasa multiplica el paso y el lote cambia el promedio y la frecuencia de actualizaciones. La velocidad visual cambia la presentación. El diseño 3×2 permite contrastes por factor con la misma semilla, pero no estima variabilidad entre semillas ni justifica usar test para elegir.',
    rules: [
      { operator: 'compareRuns', minimum: 6 },
      { operator: 'equals', metric: 'budgetAccepted', value: true },
    ],
    lab: '/lab/entrenamiento',
  },
];
specs.push(...advancedWorkshopSpecs);
export const workshopLabs = Object.fromEntries(specs.map((spec) => [spec.id, spec.lab]));
export const workshops: WorkshopDefinition[] = specs.map((spec) =>
  definitionSchema.parse({
    format: 'neural-atlas.workshop',
    schemaVersion: 1,
    id: spec.id,
    caseId: spec.id,
    contentVersion: '1.0.0',
    title: { es: spec.title },
    audience: 'FP de especialización y universidad inicial',
    estimatedMinutes: spec.minutes ?? (spec.id === 'T05' ? 30 : 20),
    prerequisites: spec.prerequisites ?? [],
    steps: [
      {
        id: 'hipotesis',
        type: 'predict',
        instruction: spec.question,
        rules: [{ operator: 'predictOutcome', minLength: 20 }],
        hints: [spec.hint],
      },
      {
        id: 'configuracion',
        type: 'configure',
        instruction: spec.configuration + ' Describe qué vas a variar y qué mantendrás constante.',
        rules: [{ operator: 'manualReflection', minLength: 12 }],
        hints: [spec.hint],
      },
      {
        id: 'ejecucion',
        type: 'execute',
        instruction:
          'Ejecuta el caso con el motor. Se conservan las medidas y la configuración usadas; no se exige una accuracy arbitraria.',
        rules: spec.rules,
        hints: [spec.hint],
      },
      {
        id: 'observacion',
        type: 'inspect',
        instruction: spec.observation,
        rules: [{ operator: 'compareObservation', minLength: 20 }],
        hints: [spec.hint],
      },
      {
        id: 'explicacion',
        type: 'explain',
        instruction: spec.explanation,
        rules: [{ operator: 'manualReflection', minLength: 30 }],
        hints: [spec.hint],
        solution: spec.solution,
      },
    ],
    rubric: [
      '0 · Todavía no aporta evidencia.',
      '1 · Describe lo que ha observado.',
      '2 · Relaciona observación y concepto.',
      '3 · Explicita límites y una alternativa o contraste.',
    ],
    teacherGuide:
      'Datos y casos sintéticos. Objetivo: justificar con evidencia del motor, no acertar una predicción por azar. Reserva tiempo para hipótesis, observación y discusión. Las pistas no penalizan y la rúbrica es manual orientativa. Adaptación: controles por teclado, texto de las medidas y movimiento reducido. No certifica aprendizaje ni sustituye revisión docente. Contenido del proyecto, licencia de código y contenido según repositorio.',
  }),
);
