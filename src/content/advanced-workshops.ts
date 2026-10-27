import { failureCases } from './failure-cases';
import type { WorkshopSpec } from './workshops';
export const advancedWorkshopSpecs: WorkshopSpec[] = [
  {
    id: 'T06',
    title: 'Aprender sin memorizar',
    question:
      '¿Reducir la norma de los pesos garantiza mejorar validación? Predice qué observarás en dos redes con el mismo inicio y datos.',
    configuration:
      'Compara referencia y L2 con 120 filas, red 2→8→8→1, 5–20 épocas y el mismo split. Elige ruido y λ; reconoce dos ensayos.',
    observation:
      'Contrasta las curvas train/validación, brechas y normas. Distingue la pérdida de datos de la penalización L2; test no interviene.',
    explanation:
      'Justifica qué sugieren las curvas y qué no prueban. Diseña un contraste con más semillas o capacidades sin escoger con test.',
    hint: 'Una norma menor es un efecto directo de la penalización; la generalización depende también de los datos y del presupuesto.',
    solution:
      'L2 penaliza pesos y cambia las actualizaciones, pero no garantiza menor pérdida de validación. Comparamos la pérdida de datos de ambos ensayos, no sumamos la penalización a una sola curva. Una semilla y una brecha no son una descomposición estadística del sesgo y la varianza.',
    rules: [
      {
        operator: 'finite',
        metrics: ['baselineLoss', 'variantLoss', 'baselineNorm', 'variantNorm'],
      },
      { operator: 'equals', metric: 'repairPreservesSplit', value: true },
      { operator: 'equals', metric: 'originalUnchanged', value: true },
    ],
    lab: '/lab/generalizacion',
    prerequisites: ['L06 · entrenamiento', 'L08 · generalización'],
    minutes: 30,
  },
  {
    id: 'T07',
    title: 'El precio de un umbral',
    question:
      'En una cohorte desbalanceada, ¿puede subir el recall y empeorar otro error al bajar el umbral? Predice el efecto.',
    configuration:
      'Usa la regla fija sigmoid de una medición sintética de L09, referencia 0,5 y un umbral alternativo. No hay entrenamiento ni probabilidades calibradas.',
    observation:
      'Compara TP/FP/TN/FN, soportes, recall y costes (FP/FN: 1/5 en G1 y 2/8 en G2). Las filas y puntuaciones son idénticas.',
    explanation:
      'Explica qué errores cambian, sus denominadores y quién debe definir los costes. No elijas una política solo por exactitud.',
    hint: 'Un umbral menor puede derivar más positivos reales y más negativos reales a revisión.',
    solution:
      'Con puntuaciones fijas, bajar el umbral nunca reduce el número de decisiones positivas. Puede reducir FN y aumentar FP. El efecto sobre costes depende de sus supuestos. Este ejemplo sintético no selecciona un umbral con test ni representa una red calibrada.',
    rules: [
      { operator: 'finite', metrics: ['fp', 'fn', 'cost'] },
      { operator: 'equals', metric: 'originalUnchanged', value: true },
    ],
    lab: '/lab/clasificacion/etica',
    prerequisites: ['L09 · métricas y umbrales'],
    minutes: 25,
  },
  {
    id: 'T08',
    title: 'Un proyecto de regresión reproducible',
    question:
      '¿Qué resultado de validación esperas frente a predecir siempre la media de train? Formula una hipótesis y un límite.',
    configuration:
      'Entrena una red 2→8→8→1 sobre 120 filas sinusoidales sintéticas, pipeline ajustado con train, 5–20 épocas y ruido elegido. Reconoce un ensayo.',
    observation:
      'Compara MSE y R² con la pérdida del baseline de media train en validación. Inspecciona curvas y exporta el experimento completo.',
    explanation:
      'Describe datos, split, pipeline, entrenamiento, evaluación y límites. Importa el experimento en la biblioteca para continuar; consulta test solo tras fijar una decisión final en L10.',
    hint: 'Un baseline se ajusta con train; su pérdida puede calcularse en validación sin ajustar nada con esas filas.',
    solution:
      'El experimento conserva dataset, split, pipeline, pesos y optimizador, por lo que puede reanudarse. La media baseline se aprende con train. MSE y R² describen validación; test se mantiene reservado. Un ajuste sinusoidal no justifica extrapolación ni causalidad.',
    rules: [
      { operator: 'finite', metrics: ['baselineLoss', 'baselineReferenceLoss'] },
      { operator: 'equals', metric: 'testConsulted', value: false },
      { operator: 'equals', metric: 'fittedTrain', value: true },
    ],
    lab: '/lab/regresion',
    prerequisites: ['L01 · pipeline', 'L06 · entrenamiento', 'L10 · regresión'],
    minutes: 35,
  },
  {
    id: 'T09',
    title: 'Reparar datos sin borrar la evidencia',
    question:
      '¿Qué fallos puede corregir la imputación y cuáles conservará el dataset? Predice qué pasará con ausencias, outliers y duplicados.',
    configuration:
      'Genera 120 filas con 15 % de ausencias, 8 % de outliers y 8 % de duplicados como probabilidades de receta. Split estratificado por grupos, mediana e indicadores de ausencia, escalado elegido.',
    observation:
      'Revisa recuentos efectivos de defectos, grupos protegidos, ajuste con train y no finitos después del pipeline. El dataset original conserva sus anotaciones.',
    explanation:
      'Distingue reparar una representación, eliminar datos y corregir etiquetas. Explica por qué los duplicados relacionados deben compartir partición y por qué no se ajusta con test.',
    hint: 'Imputar crea una representación numérica; no elimina outliers ni demuestra que los datos sean fiables.',
    solution:
      'Las estadísticas se ajustan solo con train y transforman las otras particiones. La agrupación evita que copias relacionadas aparezcan a ambos lados del split. Los outliers, etiquetas y anotaciones se conservan; obtener cero no finitos no garantiza ausencia de sesgos ni validez del dataset.',
    rules: [
      { operator: 'equals', metric: 'nonFinite', value: 0 },
      { operator: 'equals', metric: 'fittedTrain', value: true },
      { operator: 'equals', metric: 'originalUnchanged', value: true },
    ],
    lab: '/lab/datos',
    prerequisites: ['L01 · defectos y pipeline'],
    minutes: 30,
  },
  {
    id: 'T10',
    title: 'Un gradiente grande no es un destino',
    question:
      'En Rosenbrock, ¿qué diferencia hay entre recortar el gradiente y recortar la posición? Predice el primer paso con y sin clipping.',
    configuration:
      'Dos trayectorias SGD ilustrativas desde (−1,2; 1), misma tasa y presupuesto de 5–20 pasos, con/sin clipping global. No se usa una red ni se consulta test.',
    observation:
      'Contrasta norma original, norma aplicada, último coste finito y estado de parada. Si se sale del dominio, ese intento no se convierte artificialmente en un punto válido.',
    explanation:
      'Explica por qué una trayectoria detenida o un gradiente pequeño no prueban haber alcanzado un mínimo global. Propón otro punto inicial y tasa en L07.',
    hint: 'El clipping conserva la dirección del gradiente y limita su norma; no limita directamente las coordenadas del modelo.',
    solution:
      'Clipping aplica g·min(1,c/||g||). La tasa sigue multiplicando el paso. Salir del dominio se registra como parada; no se teletransporta el punto. Estacionariedad y convergencia numérica no certifican mínimo global, especialmente cerca de sillas.',
    rules: [
      {
        operator: 'finite',
        metrics: ['baselineLoss', 'variantLoss', 'baselineNorm', 'variantNorm'],
      },
    ],
    lab: '/lab/optimizacion',
    prerequisites: ['L05 · gradiente', 'L07 · paisajes'],
    minutes: 25,
  },
  {
    id: 'T11',
    title: 'Lo que oculta el promedio',
    question:
      '¿Una exactitud global alta implica que ambos canales reciben resultados equivalentes? Escribe qué evidencia pedirías antes de usar un clasificador.',
    configuration:
      'Audita dos canales sintéticos, soportes 360/40, regla fija y costes explícitos. Compara referencia 0,5 con tu umbral; no hay personas reales ni entrenamiento.',
    observation:
      'Examina métricas agregadas y por canal, denominadores y diferencias de recall. Relaciona la desigual representación con lo que el promedio oculta.',
    explanation:
      'Explica qué falta conocer sobre etiquetas, consecuencias y personas excluidas. Formula una propuesta contextual con participación; no declares justicia por igualar una métrica.',
    hint: 'Compara recuentos y tasas condicionales. Un grupo pequeño puede tener poco peso en la exactitud agregada.',
    solution:
      'El promedio pondera por soportes y puede ocultar errores concentrados. Cambiar umbrales mueve FP y FN, con consecuencias y costes discutibles. Diferencias descriptivas no son causalidad ni una certificación de justicia; faltan contexto, validez de etiquetas, subgrupos e impactos individuales.',
    rules: [
      { operator: 'equals', metric: 'originalUnchanged', value: true },
      { operator: 'equals', metric: 'testConsulted', value: false },
    ],
    lab: '/lab/clasificacion/etica',
    prerequisites: ['T07 · umbrales', 'L09 · ética por grupos'],
    minutes: 30,
  },
  {
    id: 'T12',
    title: 'Reparación que otra persona puede repetir',
    question:
      'Elige un fallo del catálogo. Predice una señal observable, una reparación y qué debe mantenerse constante; distingue una propuesta inválida de una ejecución válida.',
    configuration:
      '120 filas de lunas y dos capas de ocho neuronas. Cero/Xavier conserva Adam; tasa 1/0,01 conserva SGD y Xavier; unidades compara dos entradas de la misma sonda train con el mismo modelo. Reconoce hasta dos ensayos.',
    observation:
      'Contrasta métricas, curvas y cambio observado, conservando dataset/split. En unidades, distingue un fallo de uso del pipeline de un cambio de pesos. Exporta el experimento reparado.',
    explanation:
      'Documenta fallo, variable cambiada, evidencias, reparación y límites. Repite con otra semilla; no atribuyas una causa real solo por una curva.',
    hint: 'Una comparación válida mantiene constantes los factores que no investiga. El test no es un instrumento para elegir reparaciones.',
    solution:
      'Los casos generan hipótesis, no diagnósticos universales. ' +
      failureCases.map((c) => c.title + ': ' + c.teacherSolution).join(' '),
    rules: [
      { operator: 'equals', metric: 'repairPreservesSplit', value: true },
      { operator: 'equals', metric: 'originalUnchanged', value: true },
      { operator: 'equals', metric: 'testConsulted', value: false },
    ],
    lab: '/lab/experimentos',
    prerequisites: ['L06 · entrenamiento', 'L12 · comparación', 'T09 · datos'],
    minutes: 35,
  },
];
