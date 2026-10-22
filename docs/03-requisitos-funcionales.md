# Requisitos funcionales

Todos los RF siguientes son obligatorios para la versión completa. «Opcional» se reserva a extensiones explícitas del alcance. La columna de aceptación describe comportamiento observable; las pruebas se detallan en [el plan](13-pruebas-y-aceptacion.md). L01–L12 remiten al [catálogo](05-laboratorios.md).

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-001 | Navegar por inicio, 12 laboratorios, taller, biblioteca, glosario y ajustes | URL propia, atrás/adelante y recarga conservan ruta válida |
| RF-002 | Mostrar tres niveles de explicación | Cambiar nivel conserva experimento y presenta números actuales en paso a paso |
| RF-003 | Buscar conceptos y enlazarlos con experiencias | Los 100 conceptos tienen búsqueda por español/inglés y acceso al laboratorio |
| RF-004 | Ofrecer recorrido guiado y exploración libre | El usuario puede abandonar guía sin perder configuración |
| RF-005 | Cambiar tema claro, oscuro o del sistema | Persiste preferencia; no destella el tema opuesto al recargar |
| RF-006 | Panel de ajustes accesible | Tema, nivel, velocidad, movimiento, calidad, formato numérico, progreso y almacenamiento |
| RF-007 | Animar con reproducción, pausa, avance y reinicio | Avanzar fase no equivale a una época; se identifica qué acción se ejecuta |
| RF-008 | Ajustar velocidad visual entre 0,25× y 4× | No cambia resultado ni cantidad de actualizaciones matemáticas |
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
| RF-022 | Mostrar limitación del perceptrón en XOR | Una recta no resuelve XOR; solución multicapa y tabla verificables |
| RF-023 | Construir MLP tipado | Añadir/quitar capas dentro de límites; contador de parámetros y validación de salida |
| RF-024 | Comparar inicializaciones | Cero, Xavier y He con semilla, histogramas y efecto sobre activaciones/gradientes |
| RF-025 | Explorar activaciones y derivadas | Lineal, escalón, sigmoid, tanh, ReLU, Leaky ReLU y softmax con dominio y restricciones |
| RF-026 | Ejecutar forward inspeccionable | Seleccionar muestra y neurona; mostrar entradas, pesos, z y a sin alterar parámetros |
| RF-027 | Ejecutar backward inspeccionable | Mostrar contribuciones y regla de la cadena; verificar gradiente numérico bajo tolerancia |
| RF-028 | Distinguir época, lote e iteración | Contadores coherentes con N y batchSize; lote final incompleto incluido |
| RF-029 | Elegir estrategia de muestreo | SGD, mini-batch o lote completo independientes del optimizador |
| RF-030 | Entrenar en Worker | UI sigue respondiendo; iniciar, pausar, continuar, un lote, una época y cancelar |
| RF-031 | Configurar optimizador y tasa | SGD, Momentum, RMSprop y Adam con parámetros válidos y unidades visibles |
| RF-032 | Configurar scheduler | Constante, step y coseno actualizados al finalizar época; curva anticipada |
| RF-033 | Calcular pérdidas compatibles | MSE/MAE para regresión; BCE binaria; CE multiclase; combinaciones inválidas bloqueadas |
| RF-034 | Registrar métricas reales | Curvas train/val y estado numérico; sin curvas inventadas ni interpolación presentada como medida |
| RF-035 | Explorar superficie y trayectoria | 2D y 3D sincronizados, optimizadores comparables y puntos iniciales compartidos |
| RF-036 | Distinguir paisaje ilustrativo y corte del modelo | Etiqueta persistente; corte fija parámetros restantes y usa pérdida train del snapshot |
| RF-037 | Detectar gradientes problemáticos | Norma por capa, aviso finito/no finito y clipping configurable |
| RF-038 | Regularizar L1 y L2 | Mostrar pérdida de datos, penalización y total por separado |
| RF-039 | Explorar dropout y batch normalization | Modos train/eval distintos; estado y estadísticas visibles y exportables |
| RF-040 | Parada temprana | Solo usa validación, patience/minDelta; restaura pesos y estado de inferencia del mejor epoch |
| RF-041 | Aumentar datos de entrenamiento | Solo train; transformaciones válidas por caso y procedencia identificada |
| RF-042 | Comparar sesgo/varianza y capacidad | Varias semillas y curvas de tamaño de dataset; separar observación de explicación causal |
| RF-043 | Evaluar clasificación | Confusión, accuracy, precision, recall, F1 por clase y agregación declarada; umbral binario ajustable |
| RF-044 | Evaluar regresión | MSE, MAE, RMSE, residuos y baseline de media/mediana calculado con train |
| RF-045 | Reservar test para evaluación final | Panel oculta test durante ajuste; evaluar marca experimento y cambiar configuración invalida evaluación |
| RF-046 | Examinar incertidumbre de clasificación | Probabilidades, umbral y ejemplos cercanos a frontera; explicar que probabilidad no garantiza calibración |
| RF-047 | Inspeccionar convolución y pooling | Kernel editable, stride/padding, ventana, productos y dimensiones; alternativa tabular |
| RF-048 | Comparar experimentos A/B | Configuración, split, semilla y presupuesto visibles; dos ejecuciones aisladas y vista de diferencias |
| RF-049 | Guardar biblioteca local | Nombre, fecha, versión, estado y presupuesto; nunca sobrescribir silenciosamente |
| RF-050 | Exportar/importar modelo nativo | Pesos, topología, clases y pipeline suficientes para reproducir inferencia; validar esquema y dimensiones |
| RF-051 | Exportar/importar experimento reproducible | Datos/receta, particiones, configuración, checkpoints e historial según selección |
| RF-052 | Reanudar desde checkpoint completo | RNG, optimizador, scheduler, posición de lote y estadísticas restaurados; formato inferencia no permite reanudar |
| RF-053 | Taller guiado | Predecir → experimentar → observar → explicar; validación por evidencia, pistas y soluciones separadas |
| RF-054 | Crear y compartir taller en JSON | Esquema declarativo sin scripts; importa actividades, presets, rúbricas y restricciones |
| RF-055 | Registrar progreso local | Pendiente/en curso/completado, evidencia y reinicio selectivo; sin notas oficiales ni autenticación |
| RF-056 | Usar aplicación offline | Indicador distingue recursos completos/incompletos; rutas, Worker y presets disponibles tras instalación |
| RF-057 | Actualizar PWA sin perder sesión | Aviso de versión; activar nueva versión al guardar y detener ejecución; cachés antiguas retiradas después |
| RF-058 | Gestionar almacenamiento | Uso aproximado, exportación, borrado selectivo y manejo de cuota/denegación con sesión en memoria |
| RF-059 | Recuperar de fallos | Errores de Worker, importación, WebGL y persistencia tienen explicación y recuperación segura |
| RF-060 | Exportar evidencia didáctica | Informe Markdown con configuración, métricas, advertencias, versiones y resultados; gráficas SVG/PNG cuando compatibles |

## Reglas transversales

- Cambiar datos, pipeline, arquitectura o pérdida cancela la ejecución activa, incrementa `revision` e invalida pesos incompatibles y métricas. Confirmar solo si hay resultado sin guardar que se perdería.
- Cambiar learning rate u optimizador con sesión pausada crea un nuevo segmento del experimento; reinicia acumuladores del optimizador si cambia su tipo y lo registra. La comparación causal exige experimentos separados.
- Pista y solución se revelan por acción explícita. El progreso no afirma aprendizaje solo por abrir una ruta.
- Los mensajes de estado y errores son texto accesible; color, movimiento y 3D no son el único medio de comunicar.
