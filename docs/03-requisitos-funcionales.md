# Requisitos funcionales

RF-001–RF-068 describen el alcance completo conservado; RF-069–RF-088 incorporan las propuestas educativas revisadas. La [planificación](14-historias-y-plan-git.md) separa MVP, v1.1 y extensiones v1.2 propuestas, sin presentar todo como requisito del primer hito. La columna de aceptación describe comportamiento observable; pruebas en [el plan](13-pruebas-y-aceptacion.md) y módulos en [la matriz RF](21-trazabilidad-rf.md). L01–L12 remiten al [catálogo](05-laboratorios.md).

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-001 | Navegar por inicio, 12 laboratorios, taller, biblioteca, glosario y ajustes | URL propia, atrás/adelante y recarga conservan ruta válida |
| RF-002 | Mostrar tres niveles de explicación | Cambiar nivel conserva experimento y presenta números actuales en paso a paso |
| RF-003 | Buscar conceptos y enlazarlos con experiencias | Los 140 conceptos iniciales tienen búsqueda por español/inglés y acceso al laboratorio; sin máximo fijo del catálogo |
| RF-004 | Ofrecer recorrido guiado y exploración libre | El usuario puede abandonar guía sin perder configuración |
| RF-005 | Cambiar tema claro, oscuro o del sistema | Persiste preferencia; no destella el tema opuesto al recargar |
| RF-006 | Panel de ajustes accesible | Tema, nivel, velocidad, movimiento, calidad, formato numérico, progreso y almacenamiento |
| RF-007 | Animar con reproducción, pausa, avance y reinicio | Avanzar fase no equivale a una época; se identifica qué acción se ejecuta |
| RF-008 | Separar velocidad visual de ritmo de entrenamiento | Traza congelada 0,25×–4×; límite independiente 1–60 actualizaciones/s o máximo, con ritmo real; mismo presupuesto matemático conserva resultado |
| RF-009 | Modo presentación | Aumenta tipografía, oculta controles secundarios y permite salir con teclado |
| RF-010 | Recuperar preset y reiniciar | Distingue reiniciar pesos, datos, vista y experimento completo |
| RF-011 | Generar datos sintéticos sembrados | Misma receta, versión y semilla producen las mismas filas e IDs |
| RF-012 | Inducir defectos realistas | Ruido, etiquetas erróneas, outliers, faltantes, duplicados y desbalance tienen intensidad e informe |
| RF-013 | Importar CSV y JSON de datasets | Vista previa, asignación de columnas/tipo/target, errores por fila y confirmación antes de sustituir |
| RF-014 | Exportar datasets | CSV de datos y JSON con esquema, receta, semilla, clases, IDs y particiones |
| RF-015 | Editar muestras | Añadir, mover o borrar puntos en 2D y editar tabla; invalida resultados anteriores |
| RF-016 | Dividir entrenamiento/validación/prueba | Por defecto 70/15/15; IDs disjuntos, proporciones válidas y estratificación cuando procede |
| RF-017 | Preprocesar sin fuga de información | Imputación, codificación y escalado se ajustan solo con train y se aplican sin reajuste a val/test |
| RF-018 | Inspeccionar features, labels, target y one-hot | Tabla original y transformada, unidades, estadísticas y dimensiones |
| RF-019 | Tratar datos problemáticos | Detectar constantes, no finitos, categorías desconocidas y target inválido con explicación |
| RF-020 | Comparar dos pipelines | Mismo split y semilla; se muestra qué transformación difiere |
| RF-021 | Manipular una neurona | Entradas/pesos/sesgo/activación actualizan suma y salida exactas |
| RF-022 | Entrenar perceptrón y mostrar su limitación XOR | Regla Rosenblatt con parada; prueba de imposibilidad XOR y testigo 3/4; solución multicapa verificable |
| RF-023 | Construir MLP tipado | Añadir/quitar capas dentro de límites; contador de parámetros y validación de salida |
| RF-024 | Comparar inicializaciones | Cero, Xavier y He con semilla, histogramas y efecto sobre activaciones/gradientes |
| RF-025 | Explorar activaciones y derivadas | Lineal, escalón, sigmoid, tanh, ReLU, Leaky ReLU y softmax con dominio y restricciones |
| RF-026 | Ejecutar forward inspeccionable | Seleccionar muestra y neurona; mostrar entradas, pesos, z y a sin alterar parámetros |
| RF-027 | Ejecutar backward inspeccionable | Mostrar contribuciones y regla de la cadena; verificar gradiente numérico bajo tolerancia |
| RF-028 | Distinguir época, lote e iteración | Contadores coherentes con N y batchSize; lote final incompleto incluido |
| RF-029 | Elegir estrategia de muestreo | Lote de 1 (estocástico), mini-lote o lote completo independientes del optimizador; completo permite B=Ntrain>512 |
| RF-030 | Entrenar en Worker | UI sigue respondiendo; iniciar, pausar, continuar, un lote, una época y cancelar |
| RF-031 | Configurar optimizador y tasa | Descenso de gradiente simple (id sgd), Momentum, RMSprop y Adam con parámetros válidos y unidades visibles |
| RF-032 | Configurar scheduler | Constante, step y coseno actualizados al finalizar época; curva anticipada |
| RF-033 | Calcular pérdidas compatibles | MSE/MAE para regresión; BCE binaria; CE multiclase; combinaciones inválidas bloqueadas |
| RF-034 | Registrar métricas reales | Curvas train/val y estado numérico; sin curvas inventadas ni interpolación presentada como medida |
| RF-035 | Explorar superficie y trayectoria | 2D y 3D sincronizados, optimizadores comparables y puntos iniciales compartidos |
| RF-036 | Distinguir paisaje ilustrativo y corte del modelo | Etiqueta persistente; corte fija parámetros restantes y usa pérdida train del snapshot |
| RF-037 | Detectar gradientes problemáticos | Norma por capa, aviso finito/no finito y clipping configurable |
| RF-038 | Regularizar L1 y L2 | Mostrar pérdida de datos, penalización y total por separado |
| RF-039 | Explorar dropout y batch normalization | Modos train/eval distintos; estado y estadísticas visibles y exportables |
| RF-040 | Parada temprana | Solo usa validación, patience/minDelta; restaura pesos y estado de inferencia del mejor epoch |
| RF-041 | Aumentar datos de entrenamiento | Solo train; jitter acotado según receta con oráculo de etiqueta o desactivado si no puede justificarse; procedencia y rechazos visibles |
| RF-042 | Comparar sesgo/varianza y capacidad | Varias semillas y curvas de tamaño de dataset; separar observación de explicación causal |
| RF-043 | Evaluar clasificación | Confusión, accuracy, precision, recall, F1 con soporte por clase; positiveClassId por defecto classOrder[1], editable; umbral ajustable |
| RF-044 | Evaluar regresión | MSE, MAE, RMSE, residuos y baseline de media/mediana calculado con train |
| RF-045 | Reservar test para evaluación final | Panel oculta test durante ajuste; evaluar marca experimento y cambiar configuración invalida evaluación |
| RF-046 | Examinar incertidumbre de clasificación | Probabilidades, umbral y ejemplos cercanos a frontera; explicar que probabilidad no garantiza calibración |
| RF-047 | Inspeccionar convolución y pooling | Kernel editable, stride/padding, ventana, productos y dimensiones; alternativa tabular |
| RF-048 | Comparar experimentos A/B | Configuración, split, semilla y presupuesto visibles; dos ejecuciones aisladas y vista de diferencias |
| RF-049 | Guardar biblioteca local | IndexedDB transaccional; nombre, fecha, versión, revisión y presupuesto; conflictos no sobrescriben silenciosamente |
| RF-050 | Exportar/importar modelo nativo | Pesos, topología, clases y pipeline suficientes para reproducir inferencia; validar esquema y dimensiones |
| RF-051 | Exportar/importar experimento reproducible | Datos/receta, particiones, configuración, checkpoints e historial según selección |
| RF-052 | Recuperar y reanudar desde checkpoint completo | Copia inicial y automática en RAM, persistencia IDB periódica, RNG/optimizador/scheduler/cursor/BN completos; antigüedad visible; formato inferencia no permite reanudar |
| RF-053 | Taller guiado | Predecir → experimentar → observar → explicar; validación por evidencia, pistas y soluciones separadas |
| RF-054 | Crear y compartir taller en JSON | Esquema declarativo sin scripts; importa actividades, presets, rúbricas y restricciones |
| RF-055 | Registrar progreso local | Pendiente/en curso/completado, evidencia y reinicio selectivo; sin notas oficiales ni autenticación |
| RF-056 | Usar aplicación offline | Indicador distingue recursos completos/incompletos; rutas, Worker y presets disponibles tras instalación |
| RF-057 | Actualizar PWA sin perder sesión | Aviso de versión; activar nueva versión al guardar y detener ejecución; cachés antiguas retiradas después |
| RF-058 | Gestionar almacenamiento | Uso separado IDB/LocalStorage, cuota compartida de origen, exportación, borrado selectivo y denegación con sesión en memoria |
| RF-059 | Recuperar de fallos | Errores de Worker, importación, WebGL y persistencia tienen explicación y recuperación segura |
| RF-060 | Exportar evidencia didáctica | Informe Markdown con configuración, métricas, advertencias, versiones, predicciones previas, observaciones, explicaciones y progreso; sin identidad ni envío automático |
| RF-061 | Particionar por grupos o tiempo | Grupos disjuntos; timestamps train anteriores a val/test; impedir estratificación incompatible |
| RF-062 | Validación cruzada sin fuga | K-fold 2–10 sobre desarrollo, pipeline/modelo nuevos por fold; early stopping desactivado con presupuesto fijo; test reservado; variantes estratificada/por grupos |
| RF-063 | Explorar calibración y Brier | Diagrama de fiabilidad y puntuación Brier con bins y recuentos; distinguir calibración de accuracy |
| RF-064 | Mostrar ROC y precision-recall | Umbrales ordenados, ROC-AUC/AP y casos indefinidos; one-vs-rest explícito en multiclase |
| RF-065 | Introducir costes y métricas adicionales | Matriz de costes editable; umbral elegido en val; R²/RMSE y explicación de denominadores nulos |
| RF-066 | Comparar cambios de distribución | Escenarios de covariate shift, concept drift y train-serving skew con procedencia y parámetros visibles |
| RF-067 | Ampliar transformaciones e incertidumbre | Escalado robusto, features derivadas permitidas, curva por tamaño train y dispersión de predicciones entre semillas |
| RF-068 | Mantener catálogo abierto de conceptos | Añadir por registros declarativos versionados con ID estable, relaciones, actividad y referencias de prueba; importar/exportar paquetes sin ejecutar código |
| RF-069 | Predecir-observar-explicar en cualquier laboratorio | Modo POE captura hipótesis antes de una acción, baseline/snapshot posterior y contraste honesto; opcional en exploración libre, obligatorio solo en pasos guiados |
| RF-070 | Investigar fallos plantados | Biblioteca de casos rotulados con síntoma, evidencia y solución; T09–T12; configuraciones inválidas se diagnostican sin saltar validadores |
| RF-071 | Proponer hipótesis diagnósticas deterministas | Reglas versionadas de estancamiento, brecha, gradientes, activaciones y recall; muestran ventana/umbral/soporte y enlaces; nunca afirman causa |
| RF-072 | Ver activación oculta en el espacio de entrada | Mini-mapas por neurona en 2D del mismo snapshot, presupuesto adaptativo y tabla; no llamar semiplano a toda región profunda |
| RF-073 | Ajustar funciones y descomponer contribuciones | Seno, valor absoluto y escalón con 1/2/8/32 neuronas; curva y términos de salida lineal; advertir discontinuidad y límites del teorema |
| RF-074 | Explorar grafo de conceptos | Grafo con estado visitado/revisado y prerrequisitos, búsqueda y alternativa lista navegable por teclado; no bloquea acceso |
| RF-075 | Autoevaluarse y repasar localmente | Opción múltiple/VF con explicación y agenda local de intervalos 1/3/7/14/30 días; sin nota oficial ni notificaciones externas |
| RF-076 | Intercambiar paquete docente completo | Taller, presets, datasets, soluciones opcionales y guía docente en JSON declarativo con límites; importación transaccional y atribuciones |
| RF-077 | Comparar en proyector con controles sincronizados | Misma base A/B, bloqueo de controles comunes y una diferencia destacada; predicciones y presupuestos visibles |
| RF-078 | Comparar con regresión lineal/logística | Presets de red sin ocultas con MSE/BCE, mismo split y pipeline; explicar cuándo mayor capacidad no mejora |
| RF-079 | Comparar kNN y árbol pequeño | Comparadores acotados, entrenamiento/inferencia CPU cancelables, parámetros y costes visibles; no se confunden con una red |
| RF-080 | Explorar rejilla pequeña de hiperparámetros | Hasta 9 configuraciones y 27 ejecuciones expandidas por semillas/folds; métricas val, coste previo y test reservado |
| RF-081 | Medir importancia por permutación | Barajar una feature cruda solo en val, reaplicar pipeline congelado y repetir con seed; advertir correlación y ausencia de causalidad |
| RF-082 | Sonificación opcional | Desactivada por defecto, solo tras gesto explícito, volumen/tono ajustables y mute inmediato; conserva tabla/gráficos |
| RF-083 | Probar errores frecuentes del glosario | Campo misconceptionPresetIds lleva a un caso reproducible con advertencia, sin sustituir experimento sin guardar |
| RF-084 | Deshacer configuración de sesión | Historial acotado de hasta 50 estados, vuelve a config sin prometer deshacer pesos; cancela ejecución e invalida métricas |
| RF-085 | Ver segmentos del experimento | Timeline de cambios de lr/optimizador/reinicio con configHash y update; curvas identifican segmentos incompatibles |
| RF-086 | Ofrecer pequeños datasets reales con licencia | 2–3 paquetes opcionales, versión/hash/atribución/licencia revisadas antes de incluir; sin descarga remota obligatoria en ejecución |
| RF-087 | Reflexionar sobre ética y límites | Actividad contextual sobre FP/FN, datos y métricas por grupos sintéticos; no afirmar justicia por accuracy alta |
| RF-088 | Preparar internacionalización real | Claves de texto/locale independientes, español completo inicial y fallback explícito; añadir idiomas sin cambiar motor; traducciones pendientes identificadas |

## Reglas transversales

- Cambiar datos, pipeline, arquitectura o pérdida cancela la ejecución activa, incrementa `revision` e invalida pesos incompatibles y métricas. Confirmar solo si hay resultado sin guardar que se perdería.
- Cambiar learning rate u optimizador con sesión pausada crea un nuevo segmento del experimento; reinicia acumuladores del optimizador si cambia su tipo y lo registra. La comparación causal exige experimentos separados.
- Pista y solución se revelan por acción explícita. El progreso no afirma aprendizaje solo por abrir una ruta.
- Los mensajes de estado y errores son texto accesible; color, movimiento y 3D no son el único medio de comunicar.
