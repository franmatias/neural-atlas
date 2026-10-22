# Catálogo de experiencias

Todos los laboratorios comparten explicación en tres niveles, leyenda, inspector, reinicios separados, controles de animación, preset recuperable y evidencia exportable. Los rangos siguientes complementan los límites globales de [alcance](02-vision-y-alcance.md). Cada cambio de parámetros muestra su efecto y si exige reiniciar. Los resultados numéricos se calculan en el motor compartido.

## L01 · Datos antes que modelos — `/lab/datos`

**Pregunta:** ¿puede un buen modelo aprender de datos defectuosos? Entrada por defecto: 300 puntos de dos nubes, seed 42. Vistas: tabla, dispersión, histogramas por feature, recuentos por clase y diagrama del pipeline. La selección de una fila resalta el mismo ID en todas las vistas.

Controles: receta, N 20–10.000, seed uint32, ruido σ 0–1, outliers 0–20 %, etiquetas alteradas 0–30 %, faltantes en features 0–30 %, duplicados 0–20 %, ratio minoritario 5–50 %. Valores por defecto sanos: 0 salvo ruido 0,08. Partición por defecto 70/15/15; mínimo 10 % por conjunto. Elección de target, features numéricas/categóricas, imputación media/mediana/moda y escalado ninguno/min-max/z-score.

Animación: fila original → grupo de partición → ajuste con train → transformación. Inspector: media, desviación, min/max aprendidos y transformación de la fila. Caso adverso: feature en euros y otra en metros con outlier. Actividad: comparar escalado con/sin outlier, explicar por qué test puede quedar fuera de [0,1]. Criterio: no usar val/test para ajustar estadísticas. Para clases demasiado pequeñas, proponer regenerar o corregir proporciones antes de entrenar.

## L02 · Una neurona — `/lab/neurona`

Entradas x1=0,8, x2=0,2; pesos 0,5 y −0,3; sesgo 0,1. Resultado comprobable: z=0,44 y sigmoid(z)≈0,608259. Deslizadores x en [−2,2], w y b en [−5,5], paso 0,05; edición numérica con misma validación. Vistas 2D de sumandos, curva de activación y frontera z=0. Pesos positivos/negativos usan signo escrito, color y estilo de línea.

Animación secuencial de cada producto, acumulación, sesgo y activación; navegar hacia atrás solo inspecciona el snapshot, sin deshacer entrenamiento. Actividad: mover frontera modificando solo b. Si ambos pesos son cero, explicar salida constante y ocultar la recta indefinida. El perceptrón con escalón se presenta como clasificador, no como función diferenciable entrenable con backprop.

## L03 · Arquitectura y XOR — `/lab/arquitectura`

Constructor de capas, representación por neuronas/matrices y contador `Σ(fanIn·fanOut+fanOut)`, más parámetros de BN cuando activa. Preset entrenable candidato 2→4→1 tanh/sigmoid, pendiente de validar en D3 con semillas 7/42/123; no prometer solución antes de probarlo. Rango **0–6 capas ocultas**, 1–64 neuronas cada una y límite derivado de topología. Red sin ocultas conecta perceptrón y modelos lineal/logístico. Salida vinculada a tarea, no editable a dimensión incompatible.

XOR: cuatro puntos canónicos, frontera lineal frente a MLP, capacidad para combinar regiones. Una solución demostrativa fija usa ReLU: h1=ReLU(x1−x2), h2=ReLU(x2−x1), salida h1+h2; clasifica con umbral 0,5 y no se confunde con probabilidades entrenadas. El preset entrenable usa salida sigmoid/BCE y debe resolver con seed fijada en pruebas.

La pantalla básica de FP sigue tres pasos: red sin ocultas → XOR y combinación de regiones → constructor. Los mapas de activación seleccionados explican el papel de cada neurona. Inicialización y sus histogramas se trasladan a L04 como sección avanzada; aproximación de funciones a L10. Vista 3D de capas queda para v1.1, colapsada por defecto y sin implicar una tercera feature. El motor de perceptrón usa Rosenblatt y la prueba XOR del [doc 10](10-motor-matematico.md), no una promesa de convergencia en datos no separables.

## L04 · Activación y flujo de gradientes — `/lab/activaciones`

Comparador lineal, escalón, sigmoid, tanh, ReLU y Leaky ReLU; x ∈[−10,10], zoom; α de Leaky en [0,001,0,3], defecto 0,01. Softmax tiene panel vectorial independiente con 2–10 logits y resta del máximo. Gráficas de f y f′, valores exactos al seleccionar z y cadena de 1–20 activaciones para observar productos de derivadas.

Animación de señal y gradiente con escalas explícitas, opción logarítmica y aviso de saturación. Caso: sigmoid repetida frente a ReLU; incluir neuronas inactivas. Softmax no se dibuja como una curva escalar independiente de las otras salidas. El escalón muestra «derivada no útil para backprop» y se deshabilita como activación entrenable.

Sección avanzada de inicialización: cero/Xavier/He, seed compartida, histogramas de pesos/activaciones y normas de gradientes por capa del modelo inspeccionado. Curva de derivadas y norma de una capa no se confunden. Las mismas normas aparecen en diagnóstico de L06 y panel de L08; su cálculo durante backward se especifica en el motor.

## L05 · Del cálculo al gradiente — `/lab/propagacion`

Preset de L02 ampliado 2→2→1 y una muestra; etiquetas de dimensiones siempre visibles. Fases: entrada, productos/suma, activación, pérdida, gradiente de salida, cadena por capas, acumulación de gradientes y actualización. Se muestran simultáneamente fórmula simbólica y sustitución numérica; elegir una arista despliega `∂L/∂w`.

Controles: fase anterior/siguiente, reproducir, pausa, una actualización, learning rate 0,0001–1 con escala logarítmica (defecto 0,1), comprobar gradiente. El chequeo numérico usa copia del modelo, diferencias centradas y sin dropout/BN en entrenamiento. Solo la fase «aplicar» muta parámetros una vez; repetir inspección no aplica dos veces el gradiente. Actividad: predecir signo del cambio antes de revelarlo.

## L06 · Entrenar con criterio — `/lab/entrenamiento`

Preset dos lunas, 400 filas, 2→8→8→1, tanh, BCE, Adam, lr 0,01, batch 16, seed 42. Datos y frontera 2D, red inspeccionable, historial train/val y contadores separados. Tareas binaria/multiclase/regresión; salida/pérdida compatibles automáticamente y explicación del cambio.

Controles: muestreo lote de 1/mini-lote/lote completo; mini-lote 2–min(512,Ntrain), completo B=Ntrain sin tope 512; optimizador «Descenso de gradiente simple» (id sgd)/Momentum/RMSprop/Adam; lr 1e-5–1 en log; momentum 0–0,99 defecto 0,9, Adam β1=0,9 β2=0,999 y ε=1e-8, RMSprop ρ=0,9. Scheduler constante, step (factor 0,5 cada 50 épocas), coseno (horizonte 300, lr mínimo 1e-5). Ejecutar lote, época, iniciar, pausar y cancelar; defecto 300 épocas, configurable hasta 10.000, con coste estimado antes de iniciar. «Visual» regula traza, «Ritmo» actualizaciones/s, nunca son el mismo control.

Animación de 1 muestra no pretende mostrar todos los cálculos de un lote a velocidad real: se identifica como inspección de muestra seleccionada. Estado por época proviene del Worker. Actividad: aislar el efecto del tamaño de lote manteniendo optimizador y presupuesto de actualizaciones explícitos. Sin train válido no se habilita ejecutar.

Inspector de orden del lote: lista de IDs por época, índice de Fisher–Yates e intercambios de una permutación congelada reproducible; animarla no vuelve a barajar la ejecución activa. Panel de diagnóstico muestra normas por capa, activaciones y condiciones observadas; mini-mapas de neuronas heredan presupuesto adaptativo. Predicción previa opcional registra hipótesis antes de ejecutar o confirmar un control, según [experiencias transversales](22-experiencias-educativas.md).

## L07 · Paisajes de pérdida — `/lab/optimizacion`

Vista contornos 2D y malla 3D del mismo dominio, con selector de vista, órbita, reset, zoom y selección de punto inicial. Presets ilustrativos: cuenco, punto de silla, doble pozo y Rosenbrock. SGD, Momentum, RMSprop y Adam comparados desde mismo punto y lr; tabla de posición, gradiente y coste.

Segundo modo: corte real de dos parámetros elegidos de un modelo congelado. El resto permanece fijo; muestreo 25×25 por defecto hasta 60×60, tarea cancelable y sin contaminar el entrenamiento. Aviso: mínimos del corte no prueban mínimos de todo el espacio. Divergencia se marca al salir del dominio o superar presupuesto, sin teletransportar la trayectoria. Desvanecimiento/explosión se enlaza a L04/L06; clipping por norma global muestra gradiente original y aplicado.

## L08 · Generalización y regularización — `/lab/generalizacion`

Preset 120 puntos, ruido 0,2, red de capacidad alta frente a pequeña. Paneles train/val, brecha de pérdida, complejidad y predicciones. L1/L2 λ 0–0,1, dropout p 0–0,7 (defecto desactivado), BN por capa, early stopping patience 5–100 y minDelta 0–0,01. No permitir BN entrenable con lote efectivo de una muestra; explicar incompatibilidad.

Animaciones: conexiones temporalmente descartadas con reescalado, estadísticas de lote frente a medias móviles, checkpoint de mejor validación y restauración. Datos aumentados reciben IDs derivados y solo pertenecen a train. Bias/variance usa varias semillas (5 por defecto) y explica que la brecha de curvas aislada no es una descomposición estadística exacta. Actividad: diseñar intervención y justificar con val; test permanece oculto.

Normas ||dW||/||db|| por capa antes/después de clipping y porcentaje de activaciones inactivas/saturadas, con sonda/ventana visibles. Aumento 2D por receta: jitter gaussiano truncado a radio 0,03 en coordenadas base [-1,1], σ≤0,01; aceptar solo si el oráculo sintético mantiene etiqueta limpia y distancia al borde definida por receta ≥0,03. Hasta 10 intentos, si fallan no crear copia y registrar rechazo. No rotar/reflejar lunas automáticamente. En datos importados o recetas sin oráculo, aumento desactivado hasta una política docente explícita, sin garantía ficticia de conservar etiqueta. Ruido de etiqueta no se trata como augmentation.

## L09 · Evaluación de clasificación — `/lab/clasificacion`

Presets binario desbalanceado y tres clases solapadas. Mapa, probabilidades, matriz de confusión con filas reales y columnas predichas, métricas por clase, macro y ponderadas; precisión global se llama «exactitud (accuracy)». Umbral binario 0–1, defecto 0,5; en multiclase argmax con empate por menor índice.

Seleccionar celda filtra tabla y puntos. Animación de muestras hacia TP/FP/TN/FN solo en binario; en multiclase explicar one-vs-rest. Métricas sin denominador se muestran «no definida»; en macro/ponderada se computan como cero con aviso y support. Actividad: mostrar por qué predecir siempre mayoría puede dar accuracy alta y recall minoritario cero. Test se desbloquea por acción final y queda registrado que fue consultado.

## L10 · Regresión y residuos — `/lab/regresion`

Presets consumo energético sintético y relación sinusoidal. Línea para una feature, superficie 3D opcional para dos, proyección 2D seleccionable para más dimensiones; no ocultar que la proyección fija otras features a valores elegidos de train. Salida lineal; MSE o MAE, baseline de media o mediana train. Datos conservan unidades y métricas se muestran en escala original si se transforma target.

Controles de ruido, outliers y distribución de evaluación; gráfica de residuos vs predicción. Actividad: comparar sensibilidad de MSE/MAE a outliers usando mismo dataset/split. La pendiente de una curva ajustada no se presenta como causalidad. Para MAE, convención de derivada cero en residuo cero.

Modo «Construir una función»: 1/2/8/32 neuronas y salida lineal, seno/valor absoluto/escalón, suma de contribuciones por neurona y error cerca de discontinuidades. Es la experiencia de C037; no confundir mapas de activación con demostración del teorema. En MVP se presenta explícitamente el baseline lineal/logístico; los comparadores kNN/árbol son extensión posterior.

## L11 · Visión: del píxel al mapa — `/lab/vision`

Cuadrícula dibujable 10×10 por defecto, hasta 28×28; patrones 7, cruz, diagonal y contorno. Kernel 3×3 por defecto, opción 5×5; pesos [−5,5], stride 1–3, padding valid/same, ReLU y max-pooling 2×2 stride 2. Inspector de productos, suma y máximo elegido; mostrar dimensiones calculadas antes de aplicar operación.

Animación de ventana deslizante y barras por producto; paso manual por salida. Operación se denomina correlación cruzada, habitualmente llamada convolución en CNN, sin invertir kernel. En bordes con same, ceros marcados como padding. Pooling desempata por primer índice en orden fila. Actividad: escoger filtro para bordes y comprobar respuesta a rotación; no se afirma invariancia universal.

## L12 · Laboratorio de experimentos — `/lab/experimentos`

Configuración libre, biblioteca, duplicado, exportación y comparación A/B. Antes de ejecutar, resumen de diferencia, datos/split comunes, semillas y presupuesto: mismas épocas, mismas actualizaciones o mismo tiempo (este último no reproducible). Ejecución secuencial y progreso independiente.

Panel de evidencia: hipótesis, variable modificada, resultados reales, interpretación y límites. Un resultado interrumpido se marca incompleto. Comparaciones multisemilla ofrecen media y desviación, no intervalos inventados con n pequeño. Actividad: resolver un caso desconocido y entregar dataset, modelo y explicación reutilizables.

## Taller — `/taller`

Doce secuencias previstas: T01 datos y fuga; T02 neurona y frontera; T03 XOR y capacidad; T04 cadena del gradiente; T05 learning rate y lotes; T06 sobreajuste; T07 desbalance y umbral; T08 proyecto de regresión completo; T09 datos defectuosos; T10 gradientes/convergencia; T11 evaluación y contexto; T12 reparación reproducible. Cada una dura 15–35 min. MVP incluye T01–T05; T06–T12 se incorporan en v1.1 con objetivo, prerrequisitos, preset, predicción, pasos, evidencia y rúbrica. Mecanismos de fallos plantados en [el diseño transversal](22-experiencias-educativas.md).

El docente puede exportar/importar una secuencia JSON con actividades declarativas: `predict`, `configure`, `run`, `inspect`, `explain`. Las comprobaciones usan campos permitidos del resultado (pérdida finita, comparación, configuración y métricas), nunca JavaScript recibido. Una respuesta libre se guarda para reflexión y no recibe calificación automática de comprensión. Las soluciones están disponibles al revelar; el modo docente local no es una barrera de seguridad ni una plataforma de examen.

## Dependencias didácticas

Recorrido recomendado: L01 → L02 → L03 → L04 → L05 → L06 → L08 → L09/L10 → L12. L07 refuerza optimización tras L05; L11 es una extensión visual independiente. El acceso libre no se bloquea por progreso. El [mapa](diagrams/15-recorrido.mmd) expresa estas relaciones.

## Extensiones para el catálogo abierto

Los 40 conceptos añadidos en C101–C140 amplían estos laboratorios, sin exigir una pantalla independiente por concepto:

- **L01:** split por grupos/tiempo, mediana/IQR, categorías desconocidas, indicadores de faltantes, features derivadas permitidas y demostración aislada de fuga. Comparación de datos de entrenamiento e inferencia para detectar diferencias de unidades/pipeline.
- **L08/L12:** curva de aprendizaje por tamaño de train, con subconjuntos anidados y val fija. Validación cruzada K=2–10, defecto 5, con folds nuevos y pipeline ajustado dentro de cada train; early stopping desactivado y presupuesto fijo. Opciones aleatoria, estratificada y por grupos, nunca mezclar grupos. El conjunto de test final permanece fuera de todos los folds.
- **L09:** diagrama de fiabilidad, Brier, ROC/ROC-AUC, PR/AP y matriz de costes. En datasets desbalanceados, mostrar baseline y prevalencia; las gráficas aclaran split y clase positiva. Selector de bins de calibración 5–20, defecto 10. Umbral elegido con val; test solo confirma después.
- **L10:** R², heterocedasticidad y extrapolación; rango train marcado en ejes. Aviso de extrapolación describe distancia/rango, no estima automáticamente un intervalo de confianza.
- **L12:** escenarios de deriva de entradas, cambio del mecanismo objetivo y preprocesamiento de inferencia distinto. Los dos últimos se muestran como experimentos separados con condiciones documentadas, sin modificar silenciosamente test. Comparar continuidad de checkpoint completo frente a pesos solos y dispersión de 5 semillas por defecto.

Los conceptos se amplían mediante el contrato del [catálogo](06-matriz-conceptos.md). Un nuevo concepto puede referenciar un componente ya existente; si necesita otro cálculo o interacción, debe añadirse a requisitos, historias y pruebas antes de marcarlo implemented.
