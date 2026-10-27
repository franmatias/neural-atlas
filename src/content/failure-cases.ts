import type { WorkshopOptions } from '@/application/workshops/contracts';
export interface FailureCase {
  id: NonNullable<WorkshopOptions['advanced']>['fault'];
  title: string;
  symptom: string;
  presetId: string;
  evidenceTargets: string[];
  safeMode: 'training-copy' | 'validation-only' | 'inference-probe' | 'shadow-example';
  plantedFault: string;
  allowedInterventions: string[];
  hints: string[];
  teacherSolution: string;
}
export const failureCases: FailureCase[] = [
  {
    id: 'zero',
    title: 'Inicialización cero',
    symptom: 'Las neuronas ocultas pueden permanecer simétricas y la curva cambiar poco.',
    presetId: 'failure-zero',
    evidenceTargets: ['curvas', 'inicialización', 'split'],
    safeMode: 'training-copy',
    plantedFault: 'Pesos y sesgos inicialmente cero',
    allowedInterventions: ['Cambiar solo a Xavier'],
    hints: ['Inspecciona la simetría de las neuronas.'],
    teacherSolution:
      'Comparar Xavier y cero con Adam, mismos datos, split, tasa y presupuesto; no prometer que cualquier pérdida estancada se deba a la inicialización.',
  },
  {
    id: 'rate',
    title: 'Tasa excesiva',
    symptom: 'La pérdida puede oscilar o empeorar con pasos grandes.',
    presetId: 'failure-rate',
    evidenceTargets: ['curvas', 'tasa', 'optimizador común'],
    safeMode: 'training-copy',
    plantedFault: 'Tasa 1 con SGD',
    allowedInterventions: ['Bajar solo la tasa a 0,01'],
    hints: ['Ambas ejecuciones deben usar SGD y la misma inicialización.'],
    teacherSolution:
      'Mantener SGD y Xavier al comparar 1 frente a 0,01. Un fallo controlado no permite deducir una causa universal de toda oscilación.',
  },
  {
    id: 'units',
    title: 'Unidades de inferencia incompatibles',
    symptom: 'Una misma sonda train recibe otra salida al cambiar su escala.',
    presetId: 'failure-units',
    evidenceTargets: ['entrada de sonda', 'predicción', 'modelo idéntico'],
    safeMode: 'inference-probe',
    plantedFault: 'Entrada transformada multiplicada por 1000',
    allowedInterventions: ['Conservar el pipeline y unidades originales'],
    hints: ['No cambies pesos para compensar un error de uso.'],
    teacherSolution:
      'La sonda usa el mismo modelo y una fila train. La segunda entrada es deliberadamente incorrecta; no se guarda como pipeline recomendado.',
  },
  {
    id: 'leak',
    title: 'Fuga por escalado con holdout',
    symptom: 'Un valor extremo reservado altera el escalado de las filas train.',
    presetId: 'failure-leak',
    evidenceTargets: ['estadísticas train', 'estadísticas contaminadas', 'holdout ficticio'],
    safeMode: 'shadow-example',
    plantedFault: 'Máximo de [0,1,2] calculado incluyendo un holdout ficticio [100]',
    allowedInterventions: ['Ajustar min/max solo con train'],
    hints: ['El ejemplo es independiente del test protegido del experimento exportado.'],
    teacherSolution:
      'En el ejemplo deliberadamente incorrecto, 2/100=0,02 sustituye a 2/2=1. Se consulta un holdout ficticio para demostrar la fuga; el test del modelo exportado no se toca.',
  },
  {
    id: 'output',
    title: 'Salida incompatible con el objetivo',
    symptom:
      'El validador rechaza una salida multiclase de tres categorías con etiquetas binarias.',
    presetId: 'failure-output',
    evidenceTargets: ['error real del validador', 'salida y etiquetas'],
    safeMode: 'validation-only',
    plantedFault: 'Tres salidas propuestas para un classOrder de dos etiquetas',
    allowedInterventions: ['Restaurar salida binaria y BCE automática'],
    hints: ['Una configuración rechazada no debe entrenarse para inventar una curva.'],
    teacherSolution:
      'Se pasa la propuesta al validador común; se conserva su error y solo se entrena la reparación válida.',
  },
  {
    id: 'bn',
    title: 'Batch normalization con lote uno',
    symptom: 'El validador rechaza entrenar BN con lote de una muestra.',
    presetId: 'failure-bn',
    evidenceTargets: ['error real del validador', 'tamaño de lote', 'BN'],
    safeMode: 'validation-only',
    plantedFault: 'BN activada con batchSize=1',
    allowedInterventions: ['Mantener BN y usar lote 12'],
    hints: ['La restricción se mantiene también en el caso didáctico.'],
    teacherSolution:
      'Se valida y rechaza B=1, sin ejecutar entrenamiento inválido. La reparación conserva BN y usa B=12.',
  },
  {
    id: 'labels',
    title: 'Corrupción parcial de etiquetas',
    symptom: 'Parte de las etiquetas de una sonda train discrepa del oráculo sintético.',
    presetId: 'failure-labels',
    evidenceTargets: ['IDs de train', 'etiquetas alteradas', 'oráculo explícito'],
    safeMode: 'shadow-example',
    plantedFault: 'Una de cada cinco etiquetas train se invierte en una copia',
    allowedInterventions: ['Contrastar con el oráculo sintético mostrado'],
    hints: ['Invertir globalmente ambas clases podría ser solo renombrarlas.'],
    teacherSolution:
      'La corrupción es parcial y se compara con etiquetas limpias conocidas solo en este caso sintético. No se supone que exista un oráculo de verdad en datos reales.',
  },
  {
    id: 'relu',
    title: 'ReLU inactiva en una sonda',
    symptom: 'Un sesgo muy negativo hace cero la activación de la primera capa en una sonda train.',
    presetId: 'failure-relu',
    evidenceTargets: ['sesgo', 'activaciones de sonda', 'mismo modelo salvo sesgos'],
    safeMode: 'inference-probe',
    plantedFault: 'Sesgos de la primera capa a −100 en una copia',
    allowedInterventions: ['Restaurar los sesgos originales'],
    hints: ['Cero en una sonda no demuestra inactividad en todo el dominio.'],
    teacherSolution:
      'Se mide sobre las filas train de una copia ReLU. Se restaura el sesgo original; no se infiere muerte universal de la neurona ni se modifica la sesión activa.',
  },
];
