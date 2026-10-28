# Solucionario y rúbrica docente

Uso formativo. Conservar respuestas originales y puntuar con evidencia. Este recurso es público; registrar acceso previo al solucionario en lugar de tratarlo como un examen secreto.

## Corrección común

**2 puntos:** resultado y explicación correctos, con interpretación suficiente. **1 punto:** componente correcto pero explicación ausente/incompleta o error aritmético menor con procedimiento e interpretación correctos. **0 puntos:** respuesta aportada con error esencial o razonamiento incompatible. **NC:** no hay respuesta/evidencia o el ítem no se administró; dejar puntos vacíos en CSV y registrar el estado. «No lo sé» aportado voluntariamente se registra como respuesta y 0, distinguiéndolo de ausencia.

No conceder 2 por copiar un número sin responder la razón pedida. Registrar desacuerdos entre correctores y su resolución. Si hay dos docentes, corregir independientemente una pequeña muestra antes de acordar el criterio. Máximo por forma: 16; no sumar como cero las ausencias para producir una puntuación aparentemente completa.

| Ítem | Forma A                             | Forma B                             | Evidencia esencial para 2 puntos                                                                                   |
| ---- | ----------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1    | z=2                                 | z=0,5                               | Sustituye correctamente; editar b manualmente no equivale a aprender de datos mediante un entrenamiento            |
| 2    | No: composición afín                | No: composición afín                | Distingue profundidad de no linealidad; una frontera afín conserva la limitación de XOR                            |
| 3    | [0,5;0,5]                           | [0,5;0,5]                           | Logits iguales dan empate; no hay preferencia ni garantía de confianza/calibración por su magnitud                 |
| 4    | (0,8;0,4), L=1,12                   | (0,4;0,4), L=0,64                   | Aplica θ−ηg; −g es dirección local de mayor descenso bajo norma euclídea, sin prometer descenso con cualquier tasa |
| 5    | Es silla; L(0;0,1)=−0,01 < 0        | Mismo contraejemplo                 | Un gradiente cero no demuestra mínimo; aporta un punto próximo de pérdida menor                                    |
| 6    | (40−10)/(30−10)=1,5                 | (30−0)/(20−0)=1,5                   | Mantiene el ajuste de train; un valor transformado fuera de [0,1] puede ser correcto                               |
| 7    | Precision=8/10=0,8; recall=8/12=2/3 | Precision=6/8=0,75; recall=6/12=0,5 | Denominadores: predichos positivos frente a positivos reales                                                       |
| 8    | No; checkpoint completo             | No; checkpoint completo             | Ajustes no equivalen a pesos/momentos; distingue un checkpoint de un modelo solo de inferencia                     |

Para el ítem 4: A comienza con pérdida 4 y B con 3,25. Después, A: 0,8²+3×0,4²=1,12; B: 0,4²+3×0,4²=0,64. Estos ejemplos controlados no establecen descenso monótono universal.

## Actividades: evidencia mínima observable

| Actividad | Evidencia que buscar                                                          | Confusión que requiere seguimiento                                   |
| --------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| A01       | Distingue features/target, split y estadísticas ajustadas con train           | Usar evaluación para ajustar el preprocesado                         |
| A02       | Separa productos, sesgo y activación                                          | Confundir animación o edición manual con aprendizaje                 |
| A03       | Explica XOR y papel de la no linealidad                                       | Atribuir poder no lineal solo al número de capas                     |
| A04       | Relaciona derivada, tasa y signo de actualización                             | Llamar gradiente a cualquier error escalar                           |
| A05       | Conecta el mismo paso 2D/3D y explica silla                                   | Creer que gradiente cero demuestra mínimo o que mover cámara entrena |
| A06       | Deshacer recupera ajustes y descarta modelo; pide checkpoint para recuperarlo | Afirmar que deshacer devuelve pesos/momentos anteriores              |
| A07       | Compara train/validación y mantiene condiciones                               | Elegir por test o garantizar mejora a partir de una curva            |
| A08       | Usa denominadores y unidades correctos                                        | Confundir accuracy/precision o R²/probabilidad                       |
| A09       | Distingue etiqueta, predicción y región; interpreta softmax                   | Interpretar todo color de fondo como verdad o certeza                |
| A10       | Calcula ventana y dimensiones; diferencia filtro y entrenamiento              | Presentar el kernel manual como CNN entrenada                        |
| A11       | Hipótesis, factor, protocolo y limitación explícitos                          | Selección por test o causalidad sin diseño suficiente                |
| A12       | Explica otro ejemplo y relaciona evidencia                                    | Equiparar visita de una ficha con dominio                            |

Resultado de actividad: completa, parcial, no completada, ausente o no asignada. Registrar ayuda 0–3 por separado. «Completa» exige la evidencia de la tarea, no obtener accuracy alta ni terminar el entrenamiento de un dataset difícil. Una explicación alternativa correcta se acepta; una conclusión indeterminada bien justificada puede completar A07/A11.

## Incidencias

Crítica: pérdida de trabajo, interpretación matemática falsa confirmada u otra situación que impide usar con confianza el alcance afectado. Alta: tarea esencial bloqueada o barrera de acceso sin alternativa practicable. Media: necesita ayuda o alternativa pero puede completarse. Baja: redacción o presentación mejorable sin impedir la tarea. Registrar hecho observable, pasos, versión y alcance; la clasificación es una decisión docente/técnica revisable, no un diagnóstico sobre la persona.
