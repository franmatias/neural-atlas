# Protocolo de validación docente

**Versión evaluada:** Neural Atlas 1.4.0. **Estado:** preparado, no ejecutado.

## Objetivo y participantes

Observar si alumnado de FP de especialización puede interpretar los gráficos, operar los controles y explicar decisiones básicas de ML. Comprobar en particular split sin fuga, descenso del gradiente, configuración frente a pesos y fronteras de decisión.

Primer piloto propuesto: 6–12 participantes. Registrar conocimientos previos por categorías amplias: inicial, básico o experiencia previa. La participación y el tratamiento de resultados se organizan conforme al procedimiento del centro. Usar códigos locales como P01; no pedir nombres, correos, calificaciones oficiales ni datos personales en los datasets. Los códigos son seudónimos, no una garantía de anonimato. El centro decide acceso, conservación y eliminación; si conserva una correspondencia con personas, debe separarla de estos registros.

Un docente facilita y otra persona observa si está disponible. Si hay un único responsable, observar grupos por turnos y declarar las tareas no observadas. La modalidad recomendada para medir autonomía es individual; si se trabaja por parejas, registrar la pareja como unidad de observación y no convertir sus resultados en dos respuestas independientes.

## Preparación

1. Anotar fecha, versión, navegador real, sistema, ancho de pantalla y dispositivos de entrada. El pie muestra v1.4; una exportación de experimento identifica `appVersion: 1.4.0`. Mantener la versión durante cada sesión y separar resultados de versiones distintas.
2. Abrir [la aplicación](https://franmatias.github.io/neural-atlas/#/laboratorios). Revisar las guías y practicar los controles antes de convocar al grupo.
3. Usar únicamente ejemplos sintéticos o Iris/Wine incluidos. Cargar datos o un ejemplo sustituye la sesión: exportar primero el trabajo que se quiera conservar.
4. Para trabajo offline, preparar la caché con conexión, comprobar el estado disponible y ensayar después sin red. Las fuentes externas enlazadas requieren conexión.
5. Una actualización de la PWA es explícita: guardar/exportar, detener cálculos y cerrar otras pestañas siguiendo el panel de actualización. No actualizar a mitad de una actividad ni asumir que la RAM quedó guardada.
6. Preparar [cuaderno](01-cuaderno-alumnado.md), [cuestionarios](02-cuestionarios.md), [rúbrica](03-solucionario-rubrica.md), [acta](04-acta.md) y [registros](05-registros.md). Los registros empiezan vacíos.
7. Mantener sonido apagado inicialmente. Ofrecer teclado, movimiento reducido, contraste/tema y más tiempo cuando corresponda; anotar la adaptación sin registrar diagnósticos personales.

## Secuencia propuesta

Las duraciones son orientativas; un desvío es evidencia de carga o dificultad, no un fallo del alumno. Esta pasada cubre navegación e interpretación; no sustituye una unidad didáctica completa.

| Sesión 1                                                   | Minutos |
| ---------------------------------------------------------- | ------: |
| Encuadre, código y consentimiento/procedimiento del centro |       5 |
| Cuestionario inicial                                       |      10 |
| A01 · datos                                                |      15 |
| A02 · neurona                                              |      12 |
| A03 · arquitectura y activaciones                          |      15 |
| A04 · propagación                                          |      13 |
| A05 · descenso simultáneo                                  |      20 |
| Total                                                      |      90 |

| Sesión 2                                    | Minutos |
| ------------------------------------------- | ------: |
| Recuperar el contexto                       |       5 |
| A06 · entrenamiento e historial             |      12 |
| A07 · generalización                        |       8 |
| A08 · métricas de clasificación y regresión |      10 |
| A09 · dos mapas de decisión                 |      12 |
| A10 · visión                                |       8 |
| A11 · experimentos                          |      10 |
| A12 · transferencia y evidencia             |       5 |
| Cuestionario final                          |      10 |
| Entrevista y cierre                         |      10 |
| Total                                       |      90 |

Para un piloto focal de 90 minutos, elegir A01, A05, A06 y A09 con pre/post y entrevista, ajustar tiempos y marcar las restantes como no asignadas. No declarar cubiertos los catorce laboratorios con ese recorrido parcial.

## Observación y asistencia

Antes de tocar controles, pedir una predicción breve. Después registrar qué observó y su explicación. No dar la solución antes de medir el intento. Se puede detener una tarea por frustración o barrera de acceso y registrar la causa.

Ayuda 0: sin intervención. Ayuda 1: orientación de navegación, sin respuesta conceptual. Ayuda 2: pista conceptual o parte del procedimiento. Ayuda 3: demostración o solución del docente. Conservar el máximo nivel recibido en cada tarea. Leer una guía que el propio participante encuentra no cuenta como ayuda del observador; registrar su uso por separado.

Registrar tiempo activo aproximado, pausas ajenas a la tarea, resultado, máximo de ayuda y evidencia concreta. Distinguir barrera de interfaz, fallo técnico y confusión conceptual. Evitar atribuir una respuesta incorrecta automáticamente a un problema del software o de la persona.

## Pre/post y corrección

Asignar alternadamente A→B y B→A cuando sea posible, registrar orden y conocimientos previos. Ambas formas son propuestas paralelas, no instrumentos psicométricamente equivalentes. No publicar soluciones entre ambas medidas; la aplicación y sus guías sí forman parte de la intervención. Preguntar si hubo acceso previo al solucionario público, sin sancionar ni ocultarlo.

Cada cuestionario tiene ocho ítems de 0–2 puntos: máximo 16. Corregir con la rúbrica, conservar la respuesta original y marcar NC si falta evidencia. La ausencia no es una puntuación cero. Reportar cuántas personas tienen pares completos; describir cambio por persona y mediana. No atribuir causalidad al simulador con este diseño sin grupo de comparación. Informar efectos de práctica, conocimientos previos, ayudas y techo; alguien con 15/16 inicialmente tiene poco margen de mejora.

## Criterios locales propuestos

Revisar y aprobar estos criterios antes del piloto. No cambiarlos después para justificar un resultado favorable.

| Criterio                  | Evidencia y regla propuesta                                                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1 · funcionamiento       | Ninguna incidencia crítica/bloqueante abierta en el alcance evaluado                                                                                              |
| C2 · autonomía            | En cada tarea prioritaria A01/A05/A06/A09, al menos 80 % completa con ayuda máxima 1; al menos seis unidades observadas por tarea                                 |
| C3 · comprensión esencial | En cada ítem 4/5/6 del post, al menos 75 % obtiene 2 puntos; al menos seis cuestionarios finales asignados                                                        |
| C4 · acceso               | Responsable verifica una tarea completa con teclado y una con lector de pantalla, y los dispositivos reales previstos; documenta barreras, adaptaciones y límites |
| C5 · análisis responsable | Se informa asignación, ausencias, ayudas, pre/post emparejado y limitaciones; se conserva un acta docente motivada                                                |

En C2, el denominador son todas las unidades asignadas a esa tarea: incompletas o ausentes no cuentan como éxito. Si se asigna a seis, 80 % requiere al menos cinco éxitos. En C3, el denominador incluye todos los post asignados: NC no demuestra comprensión. Con seis asignados, 75 % requiere al menos cinco respuestas de 2 puntos. Un número menor de observaciones no permite declarar cumplido el criterio: usar «evidencia insuficiente».

Decisiones: **aceptar en el alcance observado**, **aceptar con condiciones y responsables**, **no aceptar hasta corregir** o **evidencia insuficiente**. Una incidencia bloqueante impide aceptar las tareas afectadas. No aceptar el conjunto si un criterio esencial queda sin evidencia; delimitar un alcance menor si procede. Registrar toda excepción y su justificación. La decisión final corresponde al responsable docente, no a un cálculo automático.

## Cierre

Agrupar incidencias por impacto y repetición; asignar responsables y fecha de revisión. Después de un cambio, repetir las tareas afectadas con versión identificada. Separar el cierre de una incidencia técnica del de comprensión. Compartir únicamente evidencias revisadas sin datos identificativos. Firmar el acta cuando exista evidencia real; preparar este paquete no cierra la aceptación.
