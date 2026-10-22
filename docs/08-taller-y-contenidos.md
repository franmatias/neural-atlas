# Taller y estrategia de contenidos

## Plantilla editorial obligatoria

Cada concepto incluye definición de 40–80 palabras, intuición y límite de la analogía, notación con dimensiones, ejemplo numérico del motor, control relacionado, error frecuente, pregunta y respuesta explicada. Los números dinámicos se vinculan por ID al snapshot; ningún párrafo contiene resultados supuestamente vivos calculados aparte de la simulación.

Ejemplo: peso como amplificador de una entrada. Límite: un peso no mide importancia causal aislada, depende de escala, correlaciones y arquitectura. Evitar antropomorfismos como «la neurona decide conscientemente» y no afirmar que más capas o datos siempre mejoran rendimiento.

## Doce talleres previstos por entregas

| Taller | Objetivo y preset | Evidencia automática | Explicación del alumno |
|---|---|---|---|
| T01 · Datos honestos | Dos features con escalas distintas, faltantes y outliers | Split disjunto; transformadores ajustados con train; cero no finitos | Justificar por qué ajustar min/max con test es fuga |
| T02 · Mover una frontera | Neurona binaria y dos nubes | Cambiar solo b; orientación conservada y desplazamiento observado | Diferenciar papel de w y b |
| T03 · Resolver XOR | Cuatro puntos y red 2→2→1 | Comparar máximo 3/4 lineal con 4/4 del ejemplo multicapa | Explicar por qué hacen falta regiones no lineales |
| T04 · Seguir el error | Una muestra en red pequeña | Gradiente analítico/numérico dentro de tolerancia y una actualización | Explicar signo y tamaño de ∂L/∂w |
| T05 · Ritmo de aprendizaje | Dos lunas, tres tasas y dos tamaños de lote | Ejecuciones finitas o divergencia registrada, presupuesto declarado | Diferenciar velocidad visual, lr y batch |
| T06 · Aprender sin memorizar | Pocos puntos ruidosos y red amplia | Curvas train/val; early stopping restaura checkpoint | Justificar una medida de regularización sin consultar test |
| T07 · Aciertos que engañan | Clases 95/5 y baseline mayoría | Confusión y recall minoritario; umbral comparado en val | Explicar coste de FP y FN sin atribuir costes universales |
| T08 · Proyecto de regresión | Consumo sintético y archivo CSV opcional | Pipeline válido, baseline, MAE/MSE y test final único registrado | Argumentar límites, outliers y posible cambio de distribución |
| T09 · Detectives de datos | Caso de fuga o etiquetas corruptas parcialmente | Probar hipótesis y corregir pipeline/filas con evidencia | Distinguir síntoma de causa y evitar usar test |
| T10 · Investigar gradientes | ReLU inactiva o tasa excesiva | Normas por capa, activaciones y contraste antes/después | Justificar intervención sin concluir causa solo por un aviso |
| T11 · Métricas y contexto | Desbalance y costes por grupos sintéticos | Confusión, soporte y comparación de umbrales/costes | Explicar por qué accuracy alta no certifica justicia |
| T12 · Reparar y reproducir | Experimento con un fallo plantado | Exportar reparación y reanudar con evidencia íntegra | Presentar hipótesis, observación y límites de la solución |

Cada taller tiene 5–9 pasos. Secuencia de referencia: predecir (texto/selección), configurar, ejecutar, inspeccionar evidencia y explicar. No se exige alcanzar una accuracy arbitraria en datos ruidosos para marcar comprensión. Reintentar conserva respuestas anteriores y permite comparar; pistas no penalizan.

MVP: T01–T05; v1.1: T06–T12. POE, diagnóstico y mapas están disponibles también fuera del taller; el modo libre no obliga a responder. Los fallos plantados que violan invariantes se muestran como errores de configuración para reparar, nunca se fuerza un entrenamiento inválido. Ver [experiencias transversales](22-experiencias-educativas.md).

## Modelo declarativo del taller

`WorkshopDefinition`: id, schemaVersion, title por locale, audience, estimatedMinutes, prerequisites, presetId, steps, rubric y teacherGuide opcional. Cada `WorkshopStep` tiene id, type, instruction, allowedControls, evidenceRules, hintIds y solution. Reglas: `equals`, `range`, `finite`, `changed`, `compareRuns`, `splitDisjoint`, `manualReflection`, `predictOutcome` y `compareObservation`. Operandos apuntan a un registro cerrado de métricas/configuración; profundidad máxima 5, máximo 100 reglas y 30 pasos. Strings como texto, nunca HTML ejecutable. Paquete docente completo RF-076 tiene teacherGuide obligatorio y soluciones opcionales.

`WorkshopProgress`: workshopId y contentVersion, currentStepId, answers, evidenceRefs, revealedHints, completedSteps y timestamps locales. No incluye identidad del alumno. Si cambia versión de contenido se ofrece copia del progreso anterior y se recalculan solo evidencias compatibles. Rúbrica por explicación: 0 sin evidencia, 1 observación descrita, 2 relación con concepto, 3 límites y alternativa; evaluación manual orientativa.

## Modo docente y proyección

Acciones: abrir preset, restringir controles de la actividad, ampliar fuente, ocultar solución, reiniciar para demostración y exportar taller con o sin soluciones. No existe contraseña local ni promesa de impedir acceso a soluciones empaquetadas. Un archivo sin soluciones permite compartir la actividad; un paquete completo sirve al docente. El navegador no envía resultados a ninguna persona.

## Síntesis realista y defectos

| Caso incluido | Variables / target | Generación y defectos |
|---|---|---|
| Dos lunas, círculos, XOR, espirales y nubes | 2 features; clase | Separabilidad, ruido geométrico, regiones solapadas |
| Flores simuladas | Cuatro medidas positivas; tres especies ficticias | Mezclas gaussianas correlacionadas, límites físicos y sensor con redondeo |
| Consumo de un edificio | Temperatura, superficie, ocupación, aislamiento; kWh | Relación no lineal, heterocedasticidad, faltantes y sensores saturados |
| Control de calidad | Grosor, vibración, temperatura; defecto binario | Desbalance, drift entre grupos y etiquetas con error |
| Ventas sintéticas | Precio, promoción, estacionalidad codificada; unidades | Ruido, categorías desconocidas y cambio de distribución |

Datos ficticios rotulados como tales; no se presentan como medidas reales ni como un benchmark reconocido. El dataset «flores simuladas» no es Iris. Cada receta documenta mecanismo, correlaciones, límites, unidades y target antes de añadir errores. El ruido de regresión no altera automáticamente la etiqueta categórica. Las etiquetas invertidas conservan `cleanTarget` solo en metadatos pedagógicos, excluido de features.

RNG separados por propósito: generación base, defectos, split, inicialización, orden de lotes y dropout. Cambiar ruido no desplaza el stream de inicialización. Duplicados mantienen `groupId` de origen; el split agrupa duplicados para impedir contaminación accidental. El modo «demostrar fuga» permite un split incorrecto solo en un caso aislado claramente marcado, sin exportarlo como pipeline recomendado.

Los faltantes se inyectan únicamente en features; target ausente exige descartar explícitamente la fila para entrenamiento o conservarla como consulta sin etiqueta. Si el usuario elimina filas de un split, se invalida ejecución y evaluación; nunca se rellena test con muestras de train.

## Criterios editoriales de cierre

Revisar dimensiones, unidades, terminología, fórmulas y ejemplos; vincular los 152 conceptos iniciales y los añadidos después a acciones reales; contrastar cada solución con el motor. El registro del doc 06 contiene explícitamente error frecuente, pregunta/respuesta explicada, ejemplo numérico, controles y término inglés que exige esta plantilla. La revisión humana pedagógica precede a publicación. El piloto prueba orientación y explicación del resultado; los mecanismos no certifican aprendizaje por usarlos.

El catálogo abierto y sus paquetes declarativos se especifican en [la matriz](06-matriz-conceptos.md). El contenido importado no ejecuta código ni crea funciones nuevas del motor; se valida y queda distinguido del contenido editorial revisado.

## Idiomas, autoevaluación y evidencia

Contenido independiente del código con claves y locales es/en/ca/gl/eu; español completo inicial, búsqueda por término inglés y fallback identificable. No presentar traducciones sin revisar como publicadas. MCQ/VF guarda respuesta explicada, opciones y correctOptionIds del mismo registro, sin duplicar soluciones en una segunda fuente. Repetición espaciada local y grafo accesible se incorporan por sus historias v1.1/v1.2.

El portafolio exportado incluye hipótesis, observaciones, explicaciones, pistas y progreso, sin identidad ni envío. La guía docente de cada paquete explicita objetivos, tiempos, errores comunes, debate, límites de medición, licencia y adaptaciones de accesibilidad. Datos reales son opcionales posteriores; sus fuentes y atribución se verifican antes de empaquetar, sin sustituir los sintéticos por defecto.
