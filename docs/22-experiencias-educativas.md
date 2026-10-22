# Experiencias educativas transversales · revisión 0.2

Diseño propuesto a partir de la segunda revisión del usuario. Las tres prioridades del MVP son **predice-observa-explica**, **diagnóstico con métricas reales** y **mapas de activación**. El resto se asigna a v1.1 o a extensiones v1.2 propuestas en [historias](14-historias-y-plan-git.md), con RF y pruebas propios. No se amplía el MVP con todas las sugerencias simultáneamente.

## Predice → observa → explica (RF-069)

Disponible en todos los laboratorios mediante un componente compartido `PredictionPrompt`. Activado por defecto en taller; en exploración libre se ofrece un interruptor y no exige contestar antes de cada ajuste. En modo POE, elegir una acción objetivo (entrenar un presupuesto, cambiar b, cambiar w, añadir capa o modificar un parámetro) congela baseline y solicita hipótesis **antes de aplicar**. Un arrastre completo es una acción: no abrir un diálogo por cada evento input. Teclado usa confirmación equivalente.

Registro `PredictionRecord`: id, labId, experimentId, revision, segmentId, actionSpec, baselineSnapshotId, predictedOutcome, rationale opcional, observedSnapshotId, observedOutcome, comparisonStatus y explanation. `comparisonStatus` es supported/contradicted/indeterminate/manualReview; no equivale a nota. Reglas declarativas nuevas `predictOutcome` y `compareObservation` operan sobre métricas permitidas, con tolerancia y ventana explícitas. Texto libre se contrasta manualmente, no se pretende evaluar comprensión automática.

Ejemplos: pérdida de datos aumenta/disminuye/no cambia tras N updates; en neurona 2D, cambiar b desplaza una frontera con orientación constante si w≠0; convergencia solo tras cumplir criterio finito y ventana declarados. Si la ejecución se cancela, hay error numérico o no hay evidencia suficiente, resultado indeterminado. Una frontera no lineal no recibe una etiqueta geométrica «gira» sin una definición adecuada. La observación conserva split y unidades del baseline.

Exportación RF-060 incluye hipótesis, controles cambiados, resultados, diferencia, respuesta explicada del alumno y pistas reveladas. No incluye identidad ni envío automático. Los textos extensos viven en IDB `learningEvidence`, no en LocalStorage de progreso.

## Panel de diagnóstico sin IA (RF-071)

Reglas deterministas versionadas consumen exclusivamente resúmenes del mismo run/revision, calculados por el motor durante entrenamiento. Muestran condición observada, n/ventana, límite de interpretación, conceptos relacionados y una acción experimental reversible. Nunca dicen «la causa es…». Se pueden silenciar o cambiar umbrales; la exportación conserva versión/umbrales. Estados: recopilando evidencia, activo, resuelto, silenciado.

| Regla inicial | Evidencia mínima / condición por defecto | Hipótesis sugerida, no diagnóstico causal |
|---|---|---|
| Pérdida estancada | 20 épocas finitas; mejora relativa <1 % entre medias de las primeras/últimas 5 | Probar tasa/capacidad y contrastar baseline |
| Brecha train/val creciente | 10 épocas; train mejora y brecha media de últimas 5 supera la de primeras 5 en >10 % relativo y >0,01 absoluto | Explorar capacidad, datos o regularización; unidades de pérdida visibles |
| Gradiente casi nulo por capa | RMS de gradientes de una capa <1e-8 durante 5 observaciones consecutivas | Examinar saturación, máscara o camino desconectado |
| Gradiente muy grande | Norma global >100 o clipping >50 % de últimos 20 updates | Examinar escala, tasa e inicialización |
| ReLU inactiva | Activación cero para >99 % de una sonda fija de ≥30 muestras y 5 observaciones | Inspeccionar bias y entradas; no afirmar neurona muerta para todo el dominio |
| Saturación | Sigmoid con abs(z)>8 o tanh con abs(z)>4 en >90 % de sonda, 5 observaciones | Comparar escalado e inicialización |
| Recall minoritario cero | ≥5 positivos reales evaluados y TP=0; mostrar FN y split | Revisar desbalance/umbral y coste, sin concluir injusticia por una sola métrica |

Sonda fija de hasta 256 muestras train, seed propia y evaluación máxima al terminar época; no añade barridos completos a 10 Hz. Las normas por capa se obtienen del backward. Métricas val se usan con la frecuencia configurada; un aviso basado en datos antiguos muestra antigüedad. Los umbrales son heurísticas docentes configurables, no criterios estadísticos universales.

## Mapas de activación por neurona (RF-072)

En L03/L05/L06: seleccionar neurona o abrir hasta cuatro mini-mapas. Rejilla inicial 40×40, adaptable a 20×20; misma vista x1/x2, pipeline y snapshot que el mapa de decisión. Color continuo para z o a, contorno opcional con umbral rotulado (ReLU z=0, sigmoid a=0,5 como convención, tanh a=0). Mostrar valores exactos del punto seleccionado y tabla muestreada accesible.

Una neurona de primera capa con entradas originales y transformaciones afines puede definir un semiplano de ReLU. Con features no lineales o en capas profundas las regiones pueden ser curvas/desconectadas: **no generalizar semiplanos**. Neuronas sigmoid/tanh no tienen una región binaria de «activación» intrínseca; el selector aclara la convención. Para más de dos features, fijar las restantes a valores de train elegidos y visibles, sin presentar la proyección como explicación completa.

Mismo presupuesto cooperativo que RF-035: mapas congelados, prioridad baja y actualización adaptable, solo neurona seleccionada si hay carga. Cambiar selección/cámara no modifica modelo. Relacionar la región local con la contribución a salida; el mapa no prueba importancia causal ni el teorema de aproximación universal.

## Aproximación de funciones (RF-073)

Modo de L10 con una feature en [−1,1], targets seno, abs(x) y escalón; conjuntos train/val/test sembrados. Red de una capa oculta con 1,2,8 o 32 neuronas y salida lineal. Mostrar predicción y contribuciones `w_out,j·a_j(x)` más bias, cuya suma reproduce la curva exacta del snapshot. Las contribuciones pueden cancelarse y no son efectos causales.

Comparación secuencial misma semilla/presupuesto declarado; al activar ruido observar generalización. El teorema se explica para funciones continuas sobre compactos con condiciones de activación/anchura; un escalón discontinuo no admite aproximación uniforme arbitraria por redes continuas en todo el intervalo. Mostrar error cerca del salto y aproximación en media, sin prometer que el optimizador encontrará la mejor solución.

## Fallos plantados y T09–T12 (RF-070/083)

Cada `FailureCase` contiene síntoma, presetId, evidenceTargets, safeMode, plantedFault, allowedInterventions, hints y teacherSolution. Biblioteca: fuga por escalado con test; tasa excesiva; salida/pérdida incompatibles; BN con lote de 1; etiquetas alteradas parcialmente; ReLU inactiva por bias; train-serving skew. Casos de configuración inválida se resuelven interpretando el error de validación; no se permite entrenar una combinación inválida para provocar un resultado ficticio.

Las fugas y el skew se ejecutan en un sandbox explícito «experimento deliberadamente incorrecto» y no se guardan como pipeline recomendado. «Etiquetas invertidas» significa corrupción parcial o discrepancia con un oráculo sintético mostrado en la solución: invertir ambas clases globalmente puede ser solo renombrar el problema, no un fallo detectable por métricas.

T09 investiga datos y fuga; T10 convergencia/gradientes; T11 evaluación engañosa y coste por contexto; T12 reproduce/repara un experimento y entrega evidencia. Guía docente separa evidencia que un alumno puede observar de la causa plantada que ya conoce el autor.

## Orientación, autoevaluación y contenido

RF-074: grafo dirigido de prerrequisitos y enlaces relacionados distinguibles, layout estable con búsqueda y selección; estados visitado/explicado/revisado no equivalen a dominio del concepto. Alternativa en lista topológica, filtros por laboratorio y texto de prerrequisitos. No requiere motor de ML nuevo ni bloquear navegación por progreso.

RF-075: preguntas MCQ/VF con opciones e IDs estables, respuesta explicada y ejemplo; feedback inmediato después de responder. Agenda local tipo Leitner: intervalos 1/3/7/14/30 días, correcto sube caja hasta 5, incorrecto vuelve al inicio y propone día siguiente. Fechas locales gestionadas por infraestructura; sesiones vencidas se muestran al visitar, sin alarmas ni servicio externo. El usuario puede resetear historial; no hay ranking ni calificación oficial. Guardar IDs y últimas cinco respuestas por pregunta en IDB; LocalStorage solo resumen de progreso.

RF-076: `neural-atlas.teaching-pack` incluye manifest, talleres, presets, datasets columnares, soluciones opcionales y `teacherGuide` con objetivos, prerrequisitos, duración 15–35 min por secuencia, pasos, errores, preguntas de debate, accesibilidad y atribuciones. ≤64 MiB UTF-8, ≤12 talleres/100 presets; referencias internas sin rutas de archivos remotos, validación completa antes de transacción IDB. Soluciones ausentes no se reconstruyen por red. No se promete impedir que un alumno abra soluciones incluidas.

RF-083 convierte `frequentMistake` en enlace opcional a un preset rotulado «Pruébalo», conservando sesión actual. RF-088 separa todos los textos de UI y contenidos mediante claves/locale, formato ICU cuando haga falta y fallback es; `title.en` permite búsqueda bilingüe sin afirmar que toda la interfaz inglesa está traducida. Español completo inicial; ca/gl/eu/en admitidos por estructura, traducción editorial posterior explícita.

## Comparadores y búsqueda controlada

RF-077: proyector A/B con controles comunes bloqueados, una diferencia seleccionada, tablas de config y modo POE compartido. Entrenamiento secuencial aunque las vistas se muestren lado a lado; cada curva muestra epoch/update y presupuesto. La comparación no sincroniza pesos de dos redes diferentes.

RF-078: regresión lineal = red sin ocultas/salida lineal/MSE; logística binaria = red sin ocultas/sigmoid/BCE. Etiquetas explícitas de puente a estadística; mismo pipeline/split/presupuesto y baseline de media/mayoría. Sin afirmar que todo modelo clásico sea una red entrenada igual.

RF-079, extensión v1.2: kNN k=1–min(15,Ntrain), distancia euclídea tras pipeline, voto uniforme/argmax estable en clasificación o media en regresión. Árbol CART acotado a profundidad 1–4 (defecto 3), minLeaf=5 y hasta 32 umbrales candidatos por feature por cuantiles, Gini/MSE; desempate por featureId/umbral. Se identifica la búsqueda de splits aproximada. Exportación de estas familias requerirá discriminante/model schema ampliado antes de implementarlas; MVP acepta solo modelos de red/perceptrón soportados, no un JSON de árbol fingido como pesos.

RF-080, extensión v1.2: máximo 9 configuraciones y 27 ejecuciones totales contando folds×seeds, coste estimado y cancelación antes de empezar cada una. Tabla ordenada por métrica val, todas las configuraciones intentadas visibles; informar optimismo de seleccionar el mejor entre muchos. Test queda fuera. No se autoriza una rejilla de 9×10 folds×5 seeds al ocultar su coste.

RF-081, extensión v1.2: en una copia de val barajar una feature cruda, recomputar derivadas/pipeline congelado sin fit y evaluar modelo congelado. Cinco permutaciones sembradas por defecto; importancia = aumento de pérdida (o caída de accuracy) y dispersión de repeticiones, con signo declarado. Correlaciones pueden repartir/ocultar importancia; no es causalidad, no usa test y no elimina features automáticamente.

## Sesión, accesibilidad y contexto

RF-084: hasta 50 estados de configuración inmutables, sin copias de todos los pesos; volver atrás cancela run, crea revision y restaura solo configuración/datos referenciados disponibles. Pesos reiniciados o checkpoint elegido explícitamente, nunca deshacer implícitamente entrenamiento. RF-085: segmentos de lr/optimizador/reinicios con inicio/fin de update, motivo y configHash, anotados en curvas; modelo incompatible conserva resultado histórico, sin mezclar métricas nuevas.

RF-082 es optativa v1.2: Web Audio tras gesto, desactivado al abrir, volumen máximo configurable inicialmente 0,2 y mute inmediato; tono de salida normalizada o pérdida logarítmica con rango fijo visible. Al ocultar pestaña se silencia. No sustituye texto/tabla ni activa sonido por notificaciones de diagnóstico.

RF-086: candidatos opcionales pequeños [Iris](https://archive.ics.uci.edu/dataset/53/iris) y [Wine](https://archive.ics.uci.edu/dataset/109/wine), cuyas fichas UCI indican CC BY 4.0. Antes de empaquetar, verificar fichero exacto, hash, atribución y posibles correcciones; no se han descargado ni incluido datos en D0. Los sintéticos siguen siendo predeterminados y los reales no se presentan como problemas representativos de toda aplicación real.

RF-087: caso sintético con grupos y costes diferentes, comparar FP/FN/soporte y cambios de decisión, debatir quién define costes y qué falta medir. Accuracy alta no demuestra justicia, privacidad, causalidad o idoneidad. No introducir cuentas, ranking, asistente conversacional externo, CNN/RNN/transformers entrenables o GPU para entrenamiento: se conservan los límites del alcance original.
