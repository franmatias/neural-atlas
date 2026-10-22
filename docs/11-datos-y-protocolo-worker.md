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
  strategy: 'random' | 'stratified' | 'grouped' | 'stratified-grouped' | 'temporal';
  train: string[]; validation: string[]; test: string[];
  seed: number; dataHash: string; splitHash: string;
  supportByClass: Record<string, Record<Split, number>>;
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

Sin grupos: redondeo por mayor resto, desempate train/validation/test, por clase cuando se estratifica. Con grupos y clasificación, defecto `stratified-grouped`: contar clases por grupo, ordenar grupos por tamaño descendente (empates por hash sembrado de groupId), asignar al split que minimice la suma de desviaciones cuadráticas normalizadas respecto a tamaños y soportes objetivo; desempates train/validation/test. Una pasada de intercambios entre pares reduce ese coste hasta que ninguna mejora, máximo 10 pasadas. No garantiza proporciones exactas; informar proporciones logradas. Si no logra mínimos de soporte, bloquear entrenamiento y ofrecer cambiar tamaños/datos o, explícitamente, aceptar modo exploratorio. Nunca desagrupar duplicados para mejorar balance. Temporal respeta orden y grupos; no estratifica mezclando futuro.

Soporte: al menos 2 muestras por clase en train y 1 en val/test para una evaluación definida; defecto pedagógico 5 en val y 5 en test por clase. Soportes 1–4 requieren aceptación de advertencia «estimación muy inestable»; cero mantiene métrica null y bloquea evaluación final de esa clase. Mostrar n y contadores junto a precision/recall/F1. Preset 95/5 usa 1.000 filas por defecto (50 minoritarias), no 400; incluso con 7–8 positivos de test se advierte incertidumbre, sin presentar recall como estimación precisa.

## Pipeline fit/transform

Orden por defecto: seleccionar features → imputar → codificar categorías → generar interacciones opcionales → escalar. Cada paso implementa fit(train), transform(rows,state), describe y serialize. Prohibir fit fuera de train. Numéricos constantes: min-max/z-score/robusto producen cero con escala interna 1 y aviso. Categórica desconocida usa columna reservada `__unknown__`, creada siempre para mantener dimensión; nunca ampliar vocabulario con test. Una feature sin ningún valor train válido se excluye con confirmación o bloquea el pipeline, sin estimarla desde val.

Min-max `(x−min)/(max−min)` sin clipping por defecto; z-score `(x−μ)/σ` con desviación poblacional; robusto `(x−mediana)/IQR`, cuartiles por interpolación lineal tipo 7. Imputar indicadores opcionales `isMissing(feature)` con nombres estables. Transformación del target solo en regresión y opcional, aprendida en train, con inversa para métricas; no transformar clases como cantidades continuas.

Ingeniería de features limitada a un editor declarativo: cuadrado, producto de dos numéricas y log1p con dominio válido. Sin evaluar expresiones libres; máximo 32 features después de transformar. Cada columna derivada conserva referencia a orígenes y fórmula. Una columna que coincide con target se bloquea como feature.

## Importación/exportación

| Formato | Contenido obligatorio | Validaciones |
|---|---|---|
| CSV dataset | Cabecera UTF-8, columnas y filas | ≤16 MiB, ≤10.000 filas útiles, 64 columnas crudas, mapeo explícito, target y tipos |
| JSON dataset | format, schemaVersion, dataset columnar, split opcional, provenance | ≤32 MiB UTF-8; IDs únicos, finitud y clases; no entrenar antes de preparar pipeline |
| JSON modelo | format, schemaVersion, engineVersion, network, tensors, pipeline, task, classOrder, positiveClassId, hashes | ≤8 MiB; topología válida (máximo derivado 24.330 parámetros con BN); estadísticas de inferencia completas |
| JSON experimento | metadata, dataset columnar o receta exacta, split, config, model y checkpoint opcional, history/evidence | ≤64 MiB UTF-8; sin duplicar dataset dentro del checkpoint; integridad/versión; dataHash comprobado |
| JSON taller | definición declarativa y versión de contenidos | ≤1 MiB; ≤30 pasos, ≤100 reglas, referencias válidas |
| JSON paquete de conceptos | format, schemaVersion, packId, version y concepts | ≤4 MiB y ≤500 registros por archivo; ambos límites simultáneos; IDs/referencias/versiones válidos; sin máximo global fijo |

Prefijos `format`: `neural-atlas.dataset`, `.model`, `.experiment`, `.workshop`. `schemaVersion` se refiere al archivo, `engineVersion` a algoritmos y `contentVersion` a contenido didáctico. Una versión mayor desconocida se rechaza con mensaje; migraciones solo de versiones explícitamente conocidas y sobre copia. Modelo importado se abre en una sesión nueva para no destruir la sesión actual.

Los paquetes de conceptos usan `neural-atlas.concept-pack`, cuyo registro se detalla en [el catálogo abierto](06-matriz-conceptos.md). Un paquete grande se puede dividir en archivos; el presupuesto local sigue aplicando y no se introduce un techo de conceptos en los tipos del producto.

Dataset externo columnar: `features` contiene esquema una sola vez; `columns[featureId]` contiene arrays de igual longitud; `rowIds`, `targets`, `groupIds?`, `timestamps?` y `origins` son arrays paralelos. No repetir nombres de features por fila. `Sample` es la vista lógica en memoria, no el formato de exportación. JSON usa arrays numéricos decimales; IDB guarda ArrayBuffer nativos. El experimento referencia un único bloque dataset, y los checkpoints solo su hash/split. Una matriz numérica de 10.000×32 cabe en este presupuesto sin repetir claves; cadenas/metadata arbitrarias siguen sujetas al límite de bytes. Antes de importar o exportar medir bytes UTF-8 reales y memoria estimada, no prometer que cualquier combinación de máximos dimensionales y cadenas de 4.096 caracteres cabe. Ofrecer particionar dataset o reducir columnas; no truncar silenciosamente.

CSV permite separador coma/punto y coma/tabulador y decimal punto/coma con preview; no adivinar una combinación ambigua. Cabeceras duplicadas requieren renombrar. Informe de errores con fila/columna y motivo; opciones explícitas de cancelar o excluir filas inválidas. Preservar target numérico cero, comillas escapadas y saltos de línea dentro de celdas. Limitar longitud de celda a 4.096 caracteres y profundidad JSON a 20.

Al exportar CSV para hoja de cálculo, cadenas cuyo primer carácter significativo sea `=`, `+`, `-`, `@`, tab o CR se prefijan con apóstrofo y se informa de esa protección. Valores numéricos validados, incluidos negativos, se serializan como números. JSON conserva el valor textual original sin ejecutarlo. Escape CSV y neutralización de fórmulas son operaciones distintas.

El modelo nativo reproduce inferencia; un archivo de pesos sin pipeline no se acepta como modelo completo. Un checkpoint completo añade: optimizador y t, scheduler/época, posición y orden del lote, RNG de cada stream, máscaras/estado necesarios y earlyStopping. Se exporta solo en frontera de actualización confirmada, nunca a mitad de cálculo. Dataset/receta y split exactos son necesarios para reanudar entrenamiento; si faltan, permitir solo inferencia y explicar por qué.

## Hashes

`canonical-json-v1`: claves ordenadas lexicográficamente UTF-16 en objetos, orden de arrays conservado, números finitos serializados por JSON.stringify con −0 normalizado a 0, sin undefined. Hash SHA-256 del UTF-8 canónico. `dataHash` incluye esquema de features, IDs, valores, grupos, timestamps y target; `splitHash` añade asignación y estrategia. `configHash` incluye configuración matemática y engineVersion, excluye cámara, tema y velocidad visual. El hash detecta cambios/integridad accidental, no autenticidad ni confianza del archivo.

`domain/experiments` usa SHA-256 puro (`@noble/hashes`, import específico SHA-256, versión fijada en D1) sobre bytes; codificación UTF-8 canónica pura y determinista, sin crypto.subtle, TextEncoder u otras APIs de plataforma en dominio. Vectores: SHA256 de cadena vacía y de ASCII abc, más UTF-8 con caracteres no ASCII. La utilidad puede operar en bloques acotados para no impedir cancelación. Esta decisión no implica escribir criptografía propia ni usar aleatoriedad criptográfica para el motor.

## Protocolo de Worker

```ts
interface Envelope<T> {
  protocolVersion: 1; sessionId: string; runId: string; revision: number;
  requestId: string; type: string; payload: T;
}
// Comandos: INIT, RUN, PAUSE, STEP_BATCH, STEP_EPOCH, CANCEL,
// INSPECT, CHECKPOINT, RECOVERY_ACK, ANALYZE, DISPOSE.
// Eventos: READY, ACK, PROGRESS, SNAPSHOT, PAUSED, COMPLETED,
// CANCELLED, INSPECTION, CHECKPOINT_READY, RECOVERY_CHECKPOINT,
// ANALYSIS_RESULT, ERROR.
```

Cada comando tiene un payload discriminado validado; eventos llevan sequence creciente y contadores (epoch, batchIndex, update). ACK confirma recepción, no finalización. PAUSED/CANCELLED confirman estado estable. UI descarta cualquier mensaje con sessionId/runId/revision diferentes o sequence no creciente. Nuevo INIT incrementa revisión y no permite que un evento viejo sobrescriba nueva sesión.

`PROGRESS` contiene solo contadores/tiempos (techo 10 Hz, no cálculo adicional). `SNAPSHOT` contiene métricas medidas con epoch/update y antigüedad, y resúmenes; no obliga a recalcular frontera. `INSPECTION` contiene valores/gradientes seleccionados con snapshotId. `CHECKPOINT_READY` responde a guardado; `RECOVERY_CHECKPOINT` se emite automáticamente según política de recuperación. Ambos transfieren copias, nunca buffers activos.

Antes de READY el controlador recibe y valida checkpoint inicial de update 0 y devuelve RECOVERY_ACK. Luego el Worker emite copia automática cada época o al alcanzar 2 s de cálculo activo, en la siguiente frontera confirmada; no puede serializar un lote incompleto. Controlador mantiene dos copias RAM, y confirma cada reemplazo solo tras validar sessionId/revision/finito. Si la red tarda varios segundos por lote, se muestra antigüedad real; no se promete pérdida máxima de 2 s. Persistencia IDB es menos frecuente y se define en [almacenamiento](12-persistencia-offline-y-seguridad.md). Watchdog puede recuperar sin que el usuario haya pulsado Guardar.

## Planificación, pausa y cancelación

El motor cede al event loop con tareas reales (`scheduler.yield` si compatible o setTimeout(0)), no solo microtareas. Sin BN trocea productos y acumulaciones por bloques de filas/columnas. Con BN usa barreras por capa: dense por bloques → reducción de estadísticas de todo el lote (Welford por feature y bloques, orden estable) → normalización/activación por bloques. Backward: contribuciones → reducción completa de Σdu y Σ(du·xhat) → dz por bloques → dW/db por bloques. Ningún trozo estima BN como si fuese un lote independiente. El cursor interno incluye capa, fase y bloque; objetivo ≤8 ms por trozo. También ceden evaluación, mapa y copia/hash grandes.

Parámetros, optimizador, estadísticas BN, cursor de época y RNG se mantienen en estado candidato hasta confirmación atómica del batch. Pausa/cancelación descartan candidato y restauran RNG/BN anterior, sin actualización parcial. Validar finitud del estado completo antes de confirmar. Esta planificación hace viable medir RNF-005 con BN y lote completo; no se afirma el tiempo sin medición.

STEP_BATCH confirma exactamente una actualización. STEP_EPOCH completa el resto de la época actual o una época completa si estaba en frontera. RUN es inválido si ya está running; se responde error recuperable, no se crea segundo bucle. Cambiar dataset o arquitectura: CANCEL → CANCELLED → nueva sesión INIT. Si el Worker no responde en 2 s, terminarlo y restaurar último checkpoint confirmado disponible; el trabajo no guardado después de ese checkpoint se identifica como perdido.

Errores tipados: INVALID_CONFIG, INVALID_DATA, NON_FINITE, CAPACITY_EXCEEDED, PROTOCOL_MISMATCH, ABORTED y INTERNAL_ERROR. Los dos primeros vuelven a estado ready/invalid; NON_FINITE pausa conservando último estado finito; error interno permite reinicializar. Dispose termina tareas, limpia listeners y finaliza Worker cuando se cierra la sesión. Véanse [secuencia](diagrams/05-secuencia-entrenamiento.mmd) y [estados](diagrams/07-estados-sesion.mmd).

## Reloj visual, ritmo y presupuesto adaptativo

«Visual 0,25×–4×» regula solo duración de una traza didáctica de snapshot congelado: fase base 1 s a 1×, 4 s a 0,25×, 0,25 s a 4×. No repite actualizaciones ni pretende mostrar todas las muestras de una ejecución rápida. «Ritmo de entrenamiento» es independiente: límite 1–60 actualizaciones/s o máximo, con token bucket; si CPU no llega, mostrar ritmo real, sin saltarse lotes. Mismo presupuesto de actualizaciones da mismo resultado independientemente de ambos controles.

Canales separados: PROGRESS hasta 10 Hz; gradientes por capa resumidos en el backward; curvas de pérdida al terminar época; mapa/frontera y mini-mapas solo desde copia congelada. El render pesado es tarea cooperativa de baja prioridad: presupuesto ≤10 % del tiempo de cómputo reciente. Elegir intervalo `max(200 ms, 10×coste_mapa_medido)`; si se supera, bajar rejilla 80→40→20 y mapas simultáneos hasta uno seleccionado. Si la carga sigue alta, actualizar mapa solo al pausar o terminar; indicar última epoch/update del mapa. No atrasar controles para mantener una frecuencia gráfica ficticia. El usuario puede pedir un refresco manual, también cancelable.

Antes de entrenar: estimación conservadora por operaciones de red×filas×épocas×folds×semillas y, después de un piloto optativo de un batch/época sobre copia con RNG restaurado, rango de tiempo y memoria. Conservar estimación como aproximación del dispositivo actual, no benchmark universal. Avisar al superar 60 s estimados; ofrecer reducir épocas/resolución o ejecutar. Grid/CV y cinco semillas son secuenciales y muestran coste acumulado; no se arrancan automáticamente al abrir la vista.
