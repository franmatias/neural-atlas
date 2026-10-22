# Contratos de datos, archivos y Worker

Contratos propuestos de schemaVersion 1. Los fragmentos TS son especificación, no código productivo. Todas las entradas externas se validan en tiempo de ejecución; TypeScript no valida archivos importados.

## Entidades

```ts
type Task = 'binary' | 'multiclass' | 'regression';
type Split = 'train' | 'validation' | 'test';
interface FeatureSpec {
  id: string; name: string; kind: 'numeric' | 'categorical'; unit?: string;
}
interface Sample {
  id: string; groupId?: string; timestamp?: string;
  features: Record<string, number | string | null>;
  target: number | string | null;
  origin: 'generated' | 'imported' | 'manual' | 'augmented';
}
interface Dataset {
  id: string; revision: number; task: Task; features: FeatureSpec[];
  targetName: string; rows: Sample[]; classOrder?: string[];
  recipe?: { id: string; version: number; seed: number; options: object };
}
interface DataSplit {
  strategy: 'random' | 'stratified' | 'grouped' | 'temporal';
  train: string[]; validation: string[]; test: string[];
  seed: number; dataHash: string; splitHash: string;
}
interface TensorJSON { shape: number[]; dtype: 'float64'; values: number[] }
interface PipelineState {
  version: number; inputFeatureIds: string[]; outputFeatureIds: string[];
  fittedOn: { split: 'train'; idsHash: string };
  steps: Array<{ type: string; version: number; state: object }>;
}
```

`object` en el extracto resume uniones cerradas, no permite objetos arbitrarios: cada receta, transformación y optimizador tiene su esquema específico versionado. `Sample.target=null` permite inferencia sin etiqueta, pero esa fila no participa en splits entrenables. JSON no admite NaN/Infinity; `null` es faltante, nunca cero implícito. Categorías ordenadas por primera aparición en train con vocabulario persistido; clase target de clasificación se elige explícitamente y su orden se conserva.

Un split es una asignación por IDs sobre una revisión, no tres copias que puedan divergir. Impedir intersección de IDs y, si hay groupId, de grupos. Temporal ordena timestamp y no baraja hacia el pasado. Generación de duplicados agrupa la fila original y sus copias. La edición de una fila incrementa revision e invalida hashes, particiones y resultados dependientes.

## Pipeline fit/transform

Orden por defecto: seleccionar features → imputar → codificar categorías → generar interacciones opcionales → escalar. Cada paso implementa fit(train), transform(rows,state), describe y serialize. Prohibir fit fuera de train. Numéricos constantes: min-max/z-score/robusto producen cero con escala interna 1 y aviso. Categórica desconocida usa columna reservada `__unknown__`, creada siempre para mantener dimensión; nunca ampliar vocabulario con test. Una feature sin ningún valor train válido se excluye con confirmación o bloquea el pipeline, sin estimarla desde val.

Min-max `(x−min)/(max−min)` sin clipping por defecto; z-score `(x−μ)/σ` con desviación poblacional; robusto `(x−mediana)/IQR`, cuartiles por interpolación lineal tipo 7. Imputar indicadores opcionales `isMissing(feature)` con nombres estables. Transformación del target solo en regresión y opcional, aprendida en train, con inversa para métricas; no transformar clases como cantidades continuas.

Ingeniería de features limitada a un editor declarativo: cuadrado, producto de dos numéricas y log1p con dominio válido. Sin evaluar expresiones libres; máximo 32 features después de transformar. Cada columna derivada conserva referencia a orígenes y fórmula. Una columna que coincide con target se bloquea como feature.

## Importación/exportación

| Formato | Contenido obligatorio | Validaciones |
|---|---|---|
| CSV dataset | Cabecera UTF-8, columnas y filas | ≤5 MiB, ≤10.000 filas útiles, 64 columnas crudas, mapeo explícito, target y tipos |
| JSON dataset | format, schemaVersion, dataset, split opcional, provenance | ≤10 MiB; IDs únicos, finitud y clases; no entrenar antes de preparar pipeline |
| JSON modelo | format, schemaVersion, engineVersion, network, tensors, pipeline, task, classOrder, hashes | ≤5 MiB; ≤30.000 parámetros; formas y tipos consistentes, todas las estadísticas de inferencia |
| JSON experimento | metadata, dataset o receta exacta, split, config, model y checkpoint opcional, history/evidence | ≤10 MiB; integridad, versión y compatibilidad; dataset hash comprobado |
| JSON taller | definición declarativa y versión de contenidos | ≤1 MiB; ≤30 pasos, ≤100 reglas, referencias válidas |
| JSON paquete de conceptos | format, schemaVersion, packId, version y concepts | ≤1 MiB, ≤500 registros por archivo; IDs/referencias/versiones válidos; sin máximo global fijo |

Prefijos `format`: `neural-atlas.dataset`, `.model`, `.experiment`, `.workshop`. `schemaVersion` se refiere al archivo, `engineVersion` a algoritmos y `contentVersion` a contenido didáctico. Una versión mayor desconocida se rechaza con mensaje; migraciones solo de versiones explícitamente conocidas y sobre copia. Modelo importado se abre en una sesión nueva para no destruir la sesión actual.

Los paquetes de conceptos usan `neural-atlas.concept-pack`, cuyo registro se detalla en [el catálogo abierto](06-matriz-conceptos.md). Un paquete grande se puede dividir en archivos; el presupuesto local sigue aplicando y no se introduce un techo de conceptos en los tipos del producto.

CSV permite separador coma/punto y coma/tabulador y decimal punto/coma con preview; no adivinar una combinación ambigua. Cabeceras duplicadas requieren renombrar. Informe de errores con fila/columna y motivo; opciones explícitas de cancelar o excluir filas inválidas. Preservar target numérico cero, comillas escapadas y saltos de línea dentro de celdas. Limitar longitud de celda a 4.096 caracteres y profundidad JSON a 20.

Al exportar CSV para hoja de cálculo, cadenas cuyo primer carácter significativo sea `=`, `+`, `-`, `@`, tab o CR se prefijan con apóstrofo y se informa de esa protección. Valores numéricos validados, incluidos negativos, se serializan como números. JSON conserva el valor textual original sin ejecutarlo. Escape CSV y neutralización de fórmulas son operaciones distintas.

El modelo nativo reproduce inferencia; un archivo de pesos sin pipeline no se acepta como modelo completo. Un checkpoint completo añade: optimizador y t, scheduler/época, posición y orden del lote, RNG de cada stream, máscaras/estado necesarios y earlyStopping. Se exporta solo en frontera de actualización confirmada, nunca a mitad de cálculo. Dataset/receta y split exactos son necesarios para reanudar entrenamiento; si faltan, permitir solo inferencia y explicar por qué.

## Hashes

`canonical-json-v1`: claves ordenadas lexicográficamente UTF-16 en objetos, orden de arrays conservado, números finitos serializados por JSON.stringify con −0 normalizado a 0, sin undefined. Hash SHA-256 del UTF-8 canónico. `dataHash` incluye esquema de features, IDs, valores, grupos, timestamps y target; `splitHash` añade asignación y estrategia. `configHash` incluye configuración matemática y engineVersion, excluye cámara, tema y velocidad visual. El hash detecta cambios/integridad accidental, no autenticidad ni confianza del archivo.

## Protocolo de Worker

```ts
interface Envelope<T> {
  protocolVersion: 1; sessionId: string; runId: string; revision: number;
  requestId: string; type: string; payload: T;
}
// Comandos: INIT, RUN, PAUSE, STEP_BATCH, STEP_EPOCH, CANCEL,
// INSPECT, CHECKPOINT, ANALYZE, DISPOSE.
// Eventos: READY, ACK, PROGRESS, SNAPSHOT, PAUSED, COMPLETED,
// CANCELLED, INSPECTION, CHECKPOINT_READY, ANALYSIS_RESULT, ERROR.
```

Cada comando tiene un payload discriminado validado; eventos llevan sequence creciente y contadores (epoch, batchIndex, update). ACK confirma recepción, no finalización. PAUSED/CANCELLED confirman estado estable. UI descarta cualquier mensaje con sessionId/runId/revision diferentes o sequence no creciente. Nuevo INIT incrementa revisión y no permite que un evento viejo sobrescriba nueva sesión.

`SNAPSHOT` contiene métricas train/val, configuración de identidad y resumen para render. `INSPECTION` contiene valores/gradientes de una muestra/capa seleccionada con snapshotId, no todos los tensores a 10 Hz. `CHECKPOINT_READY` copia buffers al pedir guardado; transferir únicamente copias para no separar buffers activos.

## Planificación, pausa y cancelación

El motor divide bucles por muestras/filas y cede al event loop con tareas reales (`scheduler.yield` si compatible o setTimeout(0)), no solo microtareas. Objetivo ≤8 ms por trozo. Antes de un batch se conserva estado para rollback; pausa/cancelación pueden descartar un batch incompleto y restaurar RNG/BN para reconocer la orden en ≤250 ms objetivo, sin aplicar una fracción del gradiente. El evento indica si se descartó trabajo parcial.

STEP_BATCH confirma exactamente una actualización. STEP_EPOCH completa el resto de la época actual o una época completa si estaba en frontera. RUN es inválido si ya está running; se responde error recuperable, no se crea segundo bucle. Cambiar dataset o arquitectura: CANCEL → CANCELLED → nueva sesión INIT. Si el Worker no responde en 2 s, terminarlo y restaurar último checkpoint confirmado disponible; el trabajo no guardado después de ese checkpoint se identifica como perdido.

Errores tipados: INVALID_CONFIG, INVALID_DATA, NON_FINITE, CAPACITY_EXCEEDED, PROTOCOL_MISMATCH, ABORTED y INTERNAL_ERROR. Los dos primeros vuelven a estado ready/invalid; NON_FINITE pausa conservando último estado finito; error interno permite reinicializar. Dispose termina tareas, limpia listeners y finaliza Worker cuando se cierra la sesión. Véanse [secuencia](diagrams/05-secuencia-entrenamiento.mmd) y [estados](diagrams/07-estados-sesion.mmd).
