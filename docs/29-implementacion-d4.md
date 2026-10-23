# Entrega D4 · entrenar, evaluar y recuperar

Versión 0.6.0. L06, L09 y L10 se suman a los cinco laboratorios anteriores: ocho disponibles. El paginador 0.5.2 continúa integrado. El motor aprende con los datos activos; las curvas, métricas y predicciones proceden de sus parámetros reales.

![Entrenamiento real](implementation/d4-training.png)

[Clasificación](implementation/d4-classification.png) · [Móvil oscuro](implementation/d4-mobile.png).

## Uso didáctico

1. En **Entrenamiento**, carga lunas, nubes, XOR, flores, seno o energía. Cada ejemplo sustituye el dataset activo por 400 muestras con semilla 42, partición 70/15/15 y escalado estándar ajustado solo con train. Para introducir fallos o importar datos, usa primero **Datos** y prepara allí el pipeline.
2. Configura capas ocultas, activación, inicialización, semilla, optimizador, tasa, calendario, épocas y lote. Una lista de capas vacía representa regresión logística o lineal, según la tarea. La salida se deriva de la tarea: sigmoide/BCE, softmax/CE o salida lineal/MSE–MAE.
3. Revisa el presupuesto antes de inicializar. Se muestran parámetros, actualizaciones y un rango heurístico de trabajo proporcional a conexiones. La memoria numérica mínima no incluye objetos JS, gráficos ni copias de recuperación. No se estima una duración universal. Los presupuestos amplios requieren reconocerlos en la interfaz.
4. Ejecuta un lote, una época o el entrenamiento continuo. Pausa o cancela y observa el último lote confirmado. La cancelación conserva ese estado y permite continuar; **Nueva sesión** descarta el modelo. Cambiar datos, split o pipeline invalida la sesión. Ocultar la pestaña o abandonar el laboratorio pausa el entrenamiento.
5. Evalúa validación en **Clasificación** o **Regresión**. Guarda mediciones para comparar una MLP con el modelo sin ocultas usando los mismos datos, split y pipeline. Se conservan hasta seis mediciones en memoria y se borran al cambiar la fuente. El score comparativo es MSE o exactitud con umbral 0,5/argmax; no es el umbral operativo ajustable.
6. Elige umbral y clase positiva con validación. Para consultar test debes reconocer la decisión y congelar. El Worker rechaza test antes de congelar y no vuelve a aprender después. La consulta queda recordada para los mismos datos y split, incluso al crear otra sesión o cambiar el pipeline. Elegir después otro modelo usando esa consulta contamina su interpretación.
7. Introduce una muestra nueva en valores originales. Se aplica el pipeline de entrenamiento y se ejecuta inferencia sin target ni actualización. Los valores fuera del rango de train y categorías desconocidas muestran un aviso de extrapolación; una salida probabilística no demuestra calibración.

## Historias y aceptación

| Historia | Resultado implementado | Evidencia |
|---|---|---|
| US-020 | Worker cooperativo, lote/época, pausa/cancelación, checkpoint cero, dos copias RAM y watchdog | Unidades de runtime/controlador y caída del Worker nativo en E2E |
| US-021 | SGD, Momentum, RMSprop y Adam; calendarios constante, escalones y coseno | Oráculo Adam inicial, momentos, calendarios y continuidad reproducible |
| US-022 | BCE/CE, MSE/MAE, curva train/val y telemetría de época/lote/update | Equivalencia con D3, estado atómico y recorrido de entrenamiento |
| US-029 | Confusión, soporte, TP/FP/TN/FN, precision/recall/F1, exactitud, regresión y residuos | Fixtures matemáticos y vistas binarias, multiclase y de regresión |
| US-030 | Reserva de test, congelación durable en recuperación y aviso de probabilidades no calibradas | Guardas del Worker, UI y recuperación tras congelar |
| US-048 | Hipótesis con soporte mínimo, ventanas, umbrales y posibles intervenciones | Reglas deterministas y explicaciones visibles |
| US-055 | MLP frente a regresión logística/lineal, conservando mediciones de validación | Mismo split/pipeline, configuración sin ocultas y tabla comparativa |

## Responsabilidades y contratos

- `domain/training`: optimizadores, calendarios, kernels fragmentados, sesión determinista, estimación de presupuesto y métricas. Sin DOM, Vue ni timers.
- `application/training/source.ts`: puente desde el dataset, split y pipeline preparados. Comprueba identidad e integridad de la fuente. Entrega train y validación al motor; conserva test por separado.
- `application/training/runtime.ts`: máquina de estados y planificación inyectable. Procesa generadores con objetivo de 8 ms por fragmento y límite adicional de 2.048 pasos; filas densas, gradientes y vectores de actualización ceden el control. Las operaciones auxiliares y pausas del sistema pueden superar ese objetivo; se registra el máximo observado.
- `infrastructure/workers/training.worker.ts`: conexión declarativa de mensajes, reloj y timers del Worker. El entrenamiento no tiene fallback silencioso en el hilo principal.
- `infrastructure/workers/training-client.ts`: identidades, secuencias, confirmación de copias, ping, detección de falta de respuesta y reconstrucción. Descartar un mensaje viejo no renueva su señal de vida.
- `stores/training.ts`: única sesión global, datos de test, preferencias de evaluación, comparación y advertencias. Las vistas de `features/training` presentan y solicitan acciones; la gráfica usa D3/SVG y el dibujo de red reutiliza el componente SVG de la entrega D3.

Los comandos incluyen versión, sesión, ejecución, revisión y requestId. Cada evento lleva una secuencia creciente. El motor confirma **modelo, momentos del optimizador, cursor, orden, contador y último lote juntos**; cancelar un candidato no altera esos datos. Un checkpoint se valida contra configuración, fuente, topología, momentos, permutación sembrada, historial y contadores antes de reemplazar las copias RAM. Los arrays se clonan y no se transfieren desligando la copia de recuperación.

Antes de READY se exige confirmar el checkpoint de update cero. Se envía una copia automática al acabar épocas o al alcanzar dos segundos, en una frontera confirmada y sin acumular copias pendientes sin confirmar. Pings cada 500 ms permiten detectar más de dos segundos sin eventos válidos en una pestaña visible. Una recuperación crea otra revisión, restaura el último checkpoint validado e informa de las actualizaciones observadas descartadas. **Nunca reanuda automáticamente**. El estado congelado permanece bloqueado incluso si el último checkpoint anterior era previo a la congelación.

La pausa visual y el ritmo real son controles separados. El ritmo admite máximo o 1/10/30/60 actualizaciones por segundo, sin saltarse muestras. La animación de conexiones usa velocidad visual y movimiento reducido de Ajustes. El historial contiene la época cero y registros de épocas completas; el progreso puede encontrarse dentro de la siguiente época. La gráfica y el registro no son ejemplos inventados.

## Convenciones matemáticas

Momentum usa `v = μv + g`; RMSprop usa la media móvil de cuadrados y `sqrt(s) + epsilon`. Adam corrige ambos momentos por su contador de actualizaciones, que se conserva al recuperar. Los calendarios se evalúan por índice de época desde cero. La media del lote se aplica una sola vez, incluida su cola incompleta.

La matriz de confusión utiliza filas reales y columnas predichas. En binario el umbral se refiere a la clase positiva elegida; para clase cero se utiliza `1 − p(clase 1)`. Multiclase usa argmax y resuelve empates por el primer índice del orden declarado. Una softmax de dos clases sigue siendo un vector de dos probabilidades. Los denominadores nulos se presentan como **No definida**; las medias macro/ponderada de F1 asignan cero a esos términos y lo explican.

Regresión calcula MSE, MAE, RMSE y residuos `real − predicción`. El baseline constante se ajusta exclusivamente con train: media para MSE y mediana para MAE. R² usa la media del conjunto evaluado, puede ser negativo y no se muestra como definido cuando el denominador es cero o no hay resolución numérica suficiente.

Las alertas no afirman causas. Requieren al menos 20 muestras de validación y cuatro registros. Brecha: tres registros con val > 1,5×train y diferencia > 0,1. Gradiente pequeño: tres registros con máximo ||dW|| < 10⁻⁸ y pérdida > 0,1. Gradiente grande: tres con máximo ||dW|| > 100. Meseta: cambio train < 10⁻⁵ en cinco intervalos y pérdida > 0,1. Estas normas no incluyen sesgos ni clipping; dependen de escala y contexto. La vista propone contrastar datos, tasa, escala o capacidad.

## Verificación y límites

Evidencia local de código: **223 pruebas unitarias/integración**, cobertura de líneas **97,30 %**, ramas **93,99 %**. El motor de dominio mantiene sus umbrales específicos y el conjunto pasa los controles de build, presupuesto y documentación. Los bootstrap declarativos de ambos Workers se comprueban con Workers nativos en E2E, separadamente del informe unitario de cobertura.

Los snapshots visuales se limitan a 10 Hz. Las copias de recuperación no sustituyen el modelo mostrado ni fuerzan redibujos de sus gráficos; el estado final y el historial se conservan completos.

Las pruebas incluyen equivalencia con forward/backward D3, oráculo Adam, inmutabilidad del candidato, restauración exacta en el mismo motor JS, fragmentos acotados, rechazo de estados corruptos, guardas de test, transporte viejo y watchdog. Integración recorre la aplicación con transporte controlado; E2E usa **Workers nativos** para entrenar, predecir y recuperar después de terminar el proceso. Accesibilidad automatizada, temas, movimiento reducido y responsive 360/768/1440 forman parte de los recorridos.

La batería local completa suma **50 recorridos E2E** en Chromium/WebKit. El [informe P-Max de Windows](implementation/d4-pmax-windows.json) registra hardware, versiones, build y observaciones: p95 de **4,3 ms en Chromium** y **4 ms en WebKit**, con máximos de fragmento de 57,9/10 ms bajo la carga concurrente de la batería. Confirma la latencia en este entorno; muestra también por qué el objetivo de fragmento de 8 ms no es una garantía de tiempo real.

P-Max envía 10.000×32 valores, diez clases y seis capas de 64 neuronas, con lote completo de 8.000 ejemplos train y 2.000 de validación. Registra diez latencias alternando pausa/cancelación durante un lote; el percentil 95 empírico de diez observaciones es su máximo y debe ser ≤250 ms. El máximo de fragmento se registra también. El informe JSON conserva las muestras por navegador. Esta medición incluye mensajería con el Worker y no certifica todos los dispositivos, memoria de pestaña ni tasas universales. La memoria presentada en UI es una estimación numérica mínima, no una medición del heap.

CI exige tipos, lint, cobertura con los mismos umbrales, build, presupuesto inicial, documentos y **25 recorridos por motor** en Chromium/Firefox/WebKit. Pages recibe ese artefacto y comprueba también entrenamiento, evaluación y predicción en HTTPS. La limitación del Firefox local en Windows sigue documentada; CI Linux mantiene ese motor obligatorio.

Límites conservados: hasta 10.000 ejemplos entre train/validación, 32 entradas transformadas, seis ocultas de 64, diez clases y 10.000 épocas. Mini-batch ≤512; el lote completo puede cubrir todo train. Clasificación requiere al menos dos ejemplos train por clase y uno de validación/test; soporte de validación/test menor de cinco exige reconocer su inestabilidad. Los errores no finitos conservan el último estado confirmado y recomiendan revisar escala/tasa.

Sesión, comparaciones y recuperación viven en RAM; recargar cierra esos datos. LocalStorage continúa guardando ajustes. Persistencia/exportación de modelos, taller POE, dropout/BN/early stopping, mapas de frontera adaptativos, superficies 3D y offline conservan sus fases posteriores. El glosario mantiene sus 569 fichas publicadas y 652 IDs previstos; tener un laboratorio disponible no convierte automáticamente todas las fichas pendientes en contenido editorial completo.

## Diagramas de la implementación

[29 · Recuperación y checkpoints](diagrams/29-d4-recovery-sequence.mmd) · [30 · Estados y congelación](diagrams/30-d4-training-state.mmd). Se añaden al catálogo de 30 diagramas; los 26 originales siguen siendo diseño y los cuatro siguientes reflejan D3/D4 implementados.
