export const trainingStatuses: Record<string, string> = {
  idle: 'Sin iniciar',
  initializing: 'Preparando el modelo',
  ready: 'Preparado',
  running: 'Entrenando',
  paused: 'En pausa',
  cancelled: 'Cancelado en un lote completo',
  completed: 'Épocas completadas',
  stopped: 'Parada temprana · mejor estado restaurado',
  frozen: 'Modelo congelado',
  recovering: 'Recuperando la sesión',
  error: 'Revisa la configuración',
};
const errors: Record<string, string> = {
  BUDGET:
    'Revisa y acepta el presupuesto del experimento antes de inicializar esta configuración amplia.',
  PREPARE_DATA: 'Prepara una partición y un pipeline en Datos o carga uno de los ejemplos.',
  LOW_SUPPORT:
    'Hay menos de cinco muestras de una clase en validación o prueba. Reconoce esta limitación para continuar.',
  SUPPORT: 'Cada clase necesita al menos dos ejemplos en train y uno en validación y test.',
  INVALID_CONFIG:
    'Revisa épocas, lote, tasa y parámetros del optimizador. El lote no puede superar train; los mini-batches tienen un máximo de 512.',
  INVALID_DATA: 'Hay datos, dimensiones o etiquetas incompatibles con la tarea.',
  AUGMENTATION_CONFIG:'Revisa el aumento: σ entre 0 y 0,01, de 1 a 3 copias y una semilla entera válida.',
  AUGMENTATION_POLICY:'El aumento automático requiere una receta de círculos o XOR compatible. Cambia de ejemplo o desactiva el aumento.',
  AUGMENTATION_LIMIT:'El máximo solicitado de copias supera las 10.000 filas de train y validación. Reduce las copias o el dataset.',
  ARCHITECTURE: 'Usa entre cero y seis capas ocultas de 1–64 neuronas y hasta 32 entradas.',
  SEED: 'La semilla debe ser un entero entre 0 y 4294967295.',
  PIPELINE: 'El preprocesamiento no corresponde a los datos y a su partición. Vuelve a prepararlo.',
  TEST_LOCKED: 'Pausa y congela el modelo antes de consultar test.',
  INVALID_STATE: 'Esta acción no está disponible en el estado actual.',
  BUSY: 'Espera a que termine la operación actual.',
  NON_FINITE:
    'El cálculo ha dejado de ser finito. Si había un estado confirmado, se conserva. Prueba una tasa menor o revisa la escala con una sesión nueva.',
  NO_CHECKPOINT:
    'Se perdió la conexión antes del primer punto de recuperación. Inicia una sesión nueva.',
  WORKER_UNAVAILABLE: 'No se pudo iniciar el proceso de entrenamiento. Prueba una sesión nueva.',
  CHECKPOINT_REJECTED: 'Se ha rechazado un punto de recuperación inconsistente.',
};
export function trainingError(code: string) {
  return (
    errors[code] ??
    'No se pudo completar la operación. Conserva los datos y vuelve a iniciar la sesión.'
  );
}
