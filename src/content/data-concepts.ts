import type { Concept } from './concepts';
export const dataConcepts: readonly Concept[] = [
  {
    id: 'C001',
    title: 'Características',
    english: 'Features',
    aliases: ['variables', 'columnas'],
    definition:
      'Información disponible como entrada del modelo. Seleccionar una característica no demuestra que cause el objetivo.',
    formula: 'X ∈ ℝⁿˣᵈ',
    question: '¿El objetivo debe entrar también como característica?',
    answer: 'No. Introducir lo que intentas predecir produce fuga de información.',
    lab: 'datos',
  },
  {
    id: 'C002',
    title: 'Etiquetas',
    english: 'Labels',
    aliases: ['clases'],
    definition:
      'Valores conocidos del objetivo en las muestras supervisadas. Una etiqueta errónea puede enseñar una asociación equivocada.',
    formula: 'yᵢ ∈ {0,…,K−1}',
    question: '¿Invertir unas etiquetas equivale a renombrar todas las clases?',
    answer:
      'No. La corrupción parcial mezcla señales contradictorias; un renombrado global consistente cambia la convención.',
    lab: 'datos',
  },
  {
    id: 'C003',
    title: 'Conjunto de entrenamiento',
    english: 'Training dataset',
    aliases: ['train'],
    definition:
      'Parte utilizada para aprender parámetros del modelo y estadísticas de preparación. En L01 se ajusta el pipeline con sus IDs.',
    formula: 'θpre = fit(Dtrain)',
    question: '¿La media de imputación puede usar todas las filas?',
    answer: 'No. Debe aprenderse solo con train para no incorporar información de evaluación.',
    lab: 'datos',
  },
  {
    id: 'C004',
    title: 'Conjunto de validación',
    english: 'Validation dataset',
    aliases: ['validation', 'val'],
    definition:
      'Parte reservada para comparar decisiones durante el desarrollo. Aquí recibe las transformaciones de train sin reajustarlas.',
    formula: 'Xval = transform(Dval, θpre)',
    question: '¿Se reajusta el escalador al transformar validación?',
    answer: 'No: se reutilizan los parámetros de train.',
    lab: 'datos',
  },
  {
    id: 'C005',
    title: 'Conjunto de prueba',
    english: 'Test dataset',
    aliases: ['test'],
    definition:
      'Parte reservada para evaluación final. Inspeccionar su preparación aquí no equivale a evaluar un modelo ni permite usarla para ajustar estadísticas.',
    formula: 'Xtest = transform(Dtest, θpre)',
    question: '¿Puede Min-Max dar valores mayores que uno en test?',
    answer: 'Sí. Un dato de test puede superar el máximo observado en train; aquí no se recorta.',
    lab: 'datos',
  },
  {
    id: 'C006',
    title: 'División de datos',
    english: 'Data split',
    aliases: ['particion'],
    definition:
      'Asigna IDs a entrenamiento, validación y prueba. Las proporciones realizadas pueden variar por redondeo o grupos indivisibles.',
    formula: 'Itrain ∩ Ival = Itrain ∩ Itest = Ival ∩ Itest = ∅',
    question: '¿Basta con que los IDs sean distintos para evitar toda fuga?',
    answer: 'No. Copias o muestras de la misma entidad también deben permanecer juntas.',
    lab: 'datos',
  },
  {
    id: 'C007',
    title: 'Estandarización Z-score',
    english: 'Standardization',
    aliases: ['normalizacion', 'z-score'],
    definition:
      'Resta la media de train y divide por su desviación poblacional. Estandarizar no convierte una distribución en normal.',
    formula: 'x′ = (x−μtrain)/σtrain',
    question: '¿Qué ocurre con una columna constante en train?',
    answer: 'Se usa escala interna uno y se devuelve cero al escalar, con aviso.',
    lab: 'datos',
  },
  {
    id: 'C008',
    title: 'Escalado Min-Max',
    english: 'Min-max scaling',
    aliases: ['minmax'],
    definition:
      'Usa el mínimo y máximo aprendidos en train. Los valores extremos pueden comprimir al resto de muestras.',
    formula: 'x′ = (x−mintrain)/(maxtrain−mintrain)',
    question: '¿Cambiar test debe cambiar mintrain?',
    answer: 'No. Si cambia, la preparación está utilizando datos que debía reservar.',
    lab: 'datos',
  },
  {
    id: 'C009',
    title: 'Datos atípicos',
    english: 'Outliers',
    aliases: ['extremos'],
    definition:
      'Valores alejados del patrón habitual. Pueden ser errores o casos válidos; el generador los introduce de forma explícita.',
    formula: 'sensibilidad de min, max, μ y σ',
    question: '¿Hay que borrar automáticamente cualquier extremo?',
    answer:
      'No. Hay que revisar su origen y el contexto; ser infrecuente no prueba que sea erróneo.',
    lab: 'datos',
  },
  {
    id: 'C010',
    title: 'Ruido en los datos',
    english: 'Noise',
    aliases: ['sigma'],
    definition:
      'Variación añadida al mecanismo limpio. En clasificación se perturban coordenadas; en las recetas de regresión se perturba el objetivo.',
    formula: 'ε ~ N(0, σ²)',
    question: '¿Ruido geométrico y etiquetas alteradas son lo mismo?',
    answer: 'No. Son intervenciones distintas y tienen controles y flujos aleatorios separados.',
    lab: 'datos',
  },
  {
    id: 'C012',
    title: 'Codificación one-hot',
    english: 'One-hot encoding',
    aliases: ['categorica'],
    definition:
      'Representa categorías mediante columnas indicadoras. El vocabulario se aprende solo en train y su dimensión queda fijada.',
    formula: 'categoría c → [0,…,1c,…,0]',
    question: '¿Se añade una columna nueva al encontrar otra categoría en test?',
    answer: 'No. Se activa la columna reservada para desconocidos.',
    lab: 'datos',
  },
  {
    id: 'C013',
    title: 'Objetivo',
    english: 'Target',
    aliases: ['y'],
    definition:
      'Variable que se intentará predecir. Puede ser una clase o un número según la tarea. Un objetivo nulo señala una muestra sin etiqueta.',
    formula: '(xᵢ,yᵢ)',
    question: '¿Una fila sin etiqueta entra en los splits entrenables?',
    answer:
      'No. Puede transformarse para inferencia, pero no se utiliza para ajustar el pipeline de entrenamiento.',
    lab: 'datos',
  },
  {
    id: 'C101',
    title: 'Fuga de información',
    english: 'Data leakage',
    aliases: ['contaminacion'],
    definition:
      'El procedimiento utiliza información que no estaría disponible al aprender o predecir. Ajustar el escalador con test es un ejemplo.',
    formula: 'fit solo con Dtrain',
    question: '¿Preparar antes de dividir puede contaminar?',
    answer: 'Sí: las estadísticas globales pueden contener información de validación y prueba.',
    lab: 'datos',
  },
  {
    id: 'C102',
    title: 'Faltantes e imputación',
    english: 'Missing values and imputation',
    aliases: ['media', 'mediana', 'moda', 'null'],
    definition:
      'Un faltante se representa como null y no como cero. El valor de sustitución se aprende a partir de las observaciones de train.',
    formula: 'null → media/mediana/moda de train',
    question: '¿Cómo se imputa una columna sin ninguna observación en train?',
    answer:
      'No se puede estimar desde esa partición. Se bloquea el pipeline y se propone excluirla o corregir los datos.',
    lab: 'datos',
  },
  {
    id: 'C103',
    title: 'Duplicados entre conjuntos',
    english: 'Duplicate leakage',
    aliases: ['copias'],
    definition:
      'Copias de una muestra repartidas entre train y test facilitan memorizar lo que se pretende evaluar como nuevo.',
    formula: 'groupId(original) = groupId(copias)',
    question: '¿Cambiar el ID de una copia la convierte en una entidad independiente?',
    answer: 'No. La partición conserva el grupo de procedencia.',
    lab: 'datos',
  },
  {
    id: 'C105',
    title: 'Partición estratificada',
    english: 'Stratified sampling',
    aliases: ['estratificacion'],
    definition:
      'Reparte por clase para aproximar sus proporciones. El redondeo es inevitable y las clases pequeñas requieren mirar el soporte.',
    formula: 'asignación por mayor resto en cada clase',
    question: '¿Una proporción 95/5 garantiza un test informativo?',
    answer:
      'No. También importa el número absoluto de muestras minoritarias; con pocas observaciones la estimación es inestable.',
    lab: 'datos',
  },
  {
    id: 'C106',
    title: 'Partición por grupos',
    english: 'Group split',
    aliases: ['entidades', 'pacientes'],
    definition:
      'Todas las muestras de una misma entidad se asignan a un único conjunto. Se prioriza evitar fuga sobre obtener porcentajes exactos.',
    formula: 'grupos(train) ∩ grupos(test) = ∅',
    question: '¿Se puede dividir un grupo para mejorar el balance?',
    answer: 'No. Se muestran las proporciones logradas y el soporte, sin romper la agrupación.',
    lab: 'datos',
  },
  {
    id: 'C107',
    title: 'Partición temporal',
    english: 'Temporal split',
    aliases: ['cronologico', 'fechas'],
    definition:
      'Reserva el futuro respecto al pasado, sin barajarlo. Los grupos con intervalos solapados y timestamps iguales forman bloques indivisibles.',
    formula: 'tiempo(train) < tiempo(val) < tiempo(test)',
    question: '¿Siempre se puede conseguir 70/15/15 exacto?',
    answer:
      'No. Los grupos o bloques temporales pueden impedirlo; si falta soporte, la partición se marca como no apta.',
    lab: 'datos',
  },
  {
    id: 'C110',
    title: 'Semilla aleatoria',
    english: 'Random seed',
    aliases: ['seed', 'mulberry32'],
    definition:
      'Estado de partida de un generador pseudoaleatorio determinista. La receta versionada y la semilla permiten reconstruir datos sintéticos.',
    formula: 'stream = FNV1a(seed:purpose:v1)',
    question: '¿Cambiar el viewport debe cambiar los datos?',
    answer: 'No. El renderer y el tamaño de pantalla no participan en la generación.',
    lab: 'datos',
  },
  {
    id: 'C116',
    title: 'Categorías desconocidas',
    english: 'Unknown categories',
    aliases: ['vocabulario'],
    definition:
      'Valores categóricos no observados en train. Se representan con una columna reservada que existe desde el ajuste inicial.',
    formula: 'c ∉ vocabtrain → unknown = 1',
    question: '¿La categoría literal __unknown__ colisiona con la columna reservada?',
    answer:
      'No: los IDs de salida distinguen índices de categorías conocidas y el indicador desconocido.',
    lab: 'datos',
  },
];
