# Taller y estrategia de contenidos

## Plantilla editorial obligatoria

Cada concepto incluye definición de 40–80 palabras, intuición y límite de la analogía, notación con dimensiones, ejemplo numérico del motor, control relacionado, error frecuente, pregunta y respuesta explicada. Los números dinámicos se vinculan por ID al snapshot; ningún párrafo contiene resultados supuestamente vivos calculados aparte de la simulación.

Ejemplo: peso como amplificador de una entrada. Límite: un peso no mide importancia causal aislada, depende de escala, correlaciones y arquitectura. Evitar antropomorfismos como «la neurona decide conscientemente» y no afirmar que más capas o datos siempre mejoran rendimiento.

## Ocho talleres de partida

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

Cada taller tiene 5–9 pasos. Secuencia de referencia: predecir (texto/selección), configurar, ejecutar, inspeccionar evidencia y explicar. No se exige alcanzar una accuracy arbitraria en datos ruidosos para marcar comprensión. Reintentar conserva respuestas anteriores y permite comparar; pistas no penalizan.

## Modelo declarativo del taller

`WorkshopDefinition`: id, schemaVersion, title, audience, estimatedMinutes, prerequisites, presetId, steps y rubric. Cada `WorkshopStep` tiene id, type, instruction, allowedControls, evidenceRules, hintIds y solution. Tipos permitidos de regla: `equals`, `range`, `finite`, `changed`, `compareRuns`, `splitDisjoint`, `manualReflection`. Operandos apuntan a un registro cerrado de métricas/configuración; profundidad máxima 5, máximo 100 reglas y 30 pasos por taller. Strings como texto, nunca HTML ejecutable.

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

Revisar dimensiones, unidades, terminología, fórmulas y ejemplos; vincular los 100 conceptos a acciones reales; contrastar cada solución con el motor. La revisión humana pedagógica precede a publicación de contenidos. El piloto con alumnado prueba si identifica el siguiente paso y explica el resultado, además de recoger problemas de navegación.
