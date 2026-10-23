# Catálogo abierto: 152 conceptos iniciales

Se conservan los números de la solicitud. La lista original omitía el 20: aquí se asigna **C020, datos de entrada (inputs)**, término que aparecía como cabecera. «Regresión numéricas» se normaliza a regresión numérica. Se añaden C101–C152 y no existe un máximo de conceptos. Cada fila exige explicación intuitiva/formal, acción observable y evidencia. Las pruebas P-Lxx se concretan en el [plan de pruebas](13-pruebas-y-aceptacion.md); la tabla no implica que estén implementadas ni que todas se cierren en el MVP.

| ID | Concepto | Laboratorio | Acción/evidencia exigida | Prueba |
|---|---|---|---|---|
| C001 | Features | L01 | Seleccionar columnas y observar dimensión | P-L01 |
| C002 | Labels | L01 | Cambiar clase de una fila y verla en mapa | P-L01 |
| C003 | Dataset de entrenamiento | L01 | Filtrar IDs train y contar | P-L01 |
| C004 | Dataset de validación | L01,L08 | Medir sin actualizar pesos | P-L08 |
| C005 | Dataset de prueba | L09,L10 | Evaluación final explícita | P-L09 |
| C006 | Data split | L01 | Cambiar proporciones y comprobar disjunción | P-L01 |
| C007 | Normalización | L01 | Comparar z-score antes/después | P-L01 |
| C008 | Min-Max | L01 | Inspeccionar transformación y outlier | P-L01 |
| C009 | Outliers | L01,L10 | Inyectar extremos y comparar pérdidas | P-L10 |
| C010 | Ruido | L01,L08 | Variar σ con misma semilla base | P-L01 |
| C011 | Vector de características | L01,L02 | Vincular fila y entradas de neurona | P-L02 |
| C012 | One-hot encoding | L01 | Ver categorías y columnas resultantes | P-L01 |
| C013 | Target | L01,L10 | Elegir objetivo y validar tarea | P-L10 |
| C014 | Clasificación binaria | L06,L09 | Probabilidad y decisión por umbral | P-L09 |
| C015 | Clasificación multiclase | L06,L09 | Softmax y matriz K×K | P-L09 |
| C016 | Regresión numérica | L10 | Predicción continua y residuos | P-L10 |
| C017 | Frontera de decisión | L02,L06 | Cambiar parámetros y mapa | P-L06 |
| C018 | Separabilidad lineal | L03 | Resolver dos nubes con perceptrón | P-L03 |
| C019 | No linealidad de datos | L03,L06 | XOR/círculos frente a recta | P-L03 |
| C020 | Datos de entrada | L01,L02 | Seguir dato crudo hasta vector | P-L01 |
| C021 | Neurona artificial | L02 | Calcular z y activación | P-L02 |
| C022 | Perceptrón | L02,L03 | Umbral y límite lineal | P-L03 |
| C023 | Capa de entrada | L03 | Dimensión asociada a features transformadas | P-L03 |
| C024 | Capa oculta | L03 | Añadir capa y ver parámetros | P-L03 |
| C025 | Capa de salida | L03 | Salida compatible con tarea | P-L03 |
| C026 | Fully connected | L03 | Contar aristas y pesos | P-L03 |
| C027 | Weights | L02,L05 | Modificar peso y observar gradiente | P-L05 |
| C028 | Bias | L02 | Desplazar frontera sin rotarla | P-L02 |
| C029 | Conexión/sinapsis | L03,L05 | Seleccionar arista con origen/destino | P-L05 |
| C030 | Topología | L03 | Construir y validar dimensiones | P-L03 |
| C031 | Inicialización | L03 | Repetir seed y comparar pesos | P-L03 |
| C032 | Xavier/Glorot | L04 | Mostrar límite y varianza | P-L04 |
| C033 | He | L04 | Comparar propagación con ReLU | P-L04 |
| C034 | Hiperparámetros | L06 | Distinguir configuración y pesos | P-L06 |
| C035 | Parámetros entrenables | L03 | Contar W, b, gamma y beta | P-L03 |
| C036 | Capacidad | L08 | Comparar tamaños de red | P-L08 |
| C037 | Aproximación universal | L10 | Ajustar seno/abs/escalón con 1/2/8/32 neuronas, contribuciones y límites | P-L10 |
| C038 | MLP | L03,L06 | Entrenar red multicapa | P-L06 |
| C039 | Activación | L04 | Relacionar z, a y derivada | P-L04 |
| C040 | Linealidad/no linealidad | L03,L04 | Componer capas lineales y comparar | P-L04 |
| C041 | Sigmoide | L04 | Saturación y salida [0,1] | P-L04 |
| C042 | Tanh | L04 | Simetría y derivada | P-L04 |
| C043 | ReLU | L04 | Pendiente cero/uno | P-L04 |
| C044 | Leaky ReLU | L04 | Variar α y pendiente negativa | P-L04 |
| C045 | Softmax | L04,L09 | Modificar logit y redistribuir probabilidades | P-L04 |
| C046 | Escalón | L02,L04 | Observar discontinuidad y restricción de entrenamiento | P-L04 |
| C047 | Saturación | L04 | Medir derivadas casi nulas | P-L04 |
| C048 | Forward pass | L05 | Recorrer fases con valores | P-L05 |
| C049 | Suma ponderada | L02,L05 | Desglosar productos y sesgo | P-L02 |
| C050 | Predicción | L06,L09,L10 | Inferir muestra nueva | P-L06 |
| C051 | Época | L06 | Completar todos los lotes de train | P-L06 |
| C052 | Lote | L06 | Resaltar muestras usadas | P-L06 |
| C053 | Batch size | L06 | Comparar actualizaciones por época | P-L06 |
| C054 | Iteración | L06 | Contar actualizaciones efectivas | P-L06 |
| C055 | SGD | L06 | Actualizar por muestra con SGD | P-L06 |
| C056 | Mini-batch GD | L06 | Promediar gradientes de B filas | P-L06 |
| C057 | Batch GD | L06 | Una actualización por época | P-L06 |
| C058 | Backpropagation | L05 | Mostrar delta por capa | P-L05 |
| C059 | Derivada parcial | L05 | Perturbar un único peso | P-L05 |
| C060 | Regla de la cadena | L05 | Multiplicar contribuciones | P-L05 |
| C061 | Gradiente | L05,L07 | Mostrar vector y norma | P-L07 |
| C062 | Learning rate | L06,L07 | Comparar paso pequeño/grande | P-L07 |
| C063 | Scheduler | L06 | Curva de tasa por época | P-L06 |
| C064 | Momentum | L07 | Inspeccionar velocidad acumulada | P-L07 |
| C065 | Adam | L07 | Inspeccionar momentos y corrección | P-L07 |
| C066 | RMSprop | L07 | Inspeccionar media cuadrática | P-L07 |
| C067 | Actualización de pesos | L05 | Comparar antes/después sin doble aplicación | P-L05 |
| C068 | Loss function | L05,L06 | Vincular predicción/target/error | P-L05 |
| C069 | MSE | L10 | Cuadrar residuos y promediar | P-L10 |
| C070 | MAE | L10 | Comparar con outlier | P-L10 |
| C071 | BCE | L06 | Penalizar confianza incorrecta | P-L06 |
| C072 | CE categórica | L09 | Extraer probabilidad de clase real | P-L09 |
| C073 | Loss landscape | L07 | Relacionar contorno y malla | P-L07 |
| C074 | Mínimo local | L07 | Comparar puntos iniciales | P-L07 |
| C075 | Mínimo global | L07 | Identificarlo solo en superficie conocida | P-L07 |
| C076 | Punto de silla | L07 | Curvaturas de signo opuesto | P-L07 |
| C077 | Convergencia | L07 | Observar trayectoria y norma | P-L07 |
| C078 | Divergencia | L07 | Detectar salida de dominio/no finitos | P-L07 |
| C079 | Vanishing gradient | L04,L08 | Ver normas por capa y saturación | P-L08 |
| C080 | Exploding gradient | L07,L08 | Mostrar norma antes/después de clipping | P-L08 |
| C081 | Overfitting | L08 | Separar pérdida train/val | P-L08 |
| C082 | Underfitting | L08 | Comparar con mayor capacidad | P-L08 |
| C083 | Varianza alta | L08,L12 | Comparación entre semillas | P-L12 |
| C084 | Sesgo alto / tradeoff | L08 | Capacidad, datos y rendimiento de val | P-L08 |
| C085 | L1 | L08 | Mostrar penalización y gradiente | P-L08 |
| C086 | L2 | L08 | Mostrar contracción de pesos | P-L08 |
| C087 | Dropout | L08 | Máscaras train y ausencia en inferencia | P-L08 |
| C088 | Early stopping | L08 | Restaurar mejor checkpoint | P-L08 |
| C089 | Data augmentation | L08 | Jitter acotado solo train con oráculo/receta y rechazos visibles | P-L08 |
| C090 | Batch normalization | L08 | Estadísticas train/eval y gradientes | P-L08 |
| C091 | Matriz de confusión | L09 | Filtrar muestras por celda | P-L09 |
| C092 | TP | L09 | Identificar positivos correctos | P-L09 |
| C093 | FP | L09 | Identificar falsas alarmas | P-L09 |
| C094 | TN | L09 | Identificar negativos correctos | P-L09 |
| C095 | FN | L09 | Identificar positivos omitidos | P-L09 |
| C096 | Accuracy / exactitud | L09 | Comparar aciertos/total y baseline | P-L09 |
| C097 | Precision / precisión | L09 | Calcular TP/(TP+FP) | P-L09 |
| C098 | Recall / sensibilidad | L09 | Calcular TP/(TP+FN) | P-L09 |
| C099 | F1 | L09 | Media armónica y caso no definido | P-L09 |
| C100 | Curva de pérdida por época / loss curve | L06,L08 | Ejes, split y registro por época | P-L06 |
| C101 | Fuga de información / data leakage | L01 | Comparar pipeline correcto y caso contaminado rotulado | P-L01 |
| C102 | Datos faltantes e imputación | L01 | Introducir faltantes y ajustar imputador con train | P-L01 |
| C103 | Duplicados y contaminación entre splits | L01 | Agrupar duplicados y comprobar grupos disjuntos | P-L01 |
| C104 | Desbalance de clases | L09 | Comparar baseline mayoritario y recall | P-L09 |
| C105 | Muestreo estratificado | L01 | Conservar proporciones dentro de tolerancia de redondeo | P-L01 |
| C106 | Partición por grupos | L01 | Impedir que una entidad aparezca en dos splits | P-L01 |
| C107 | Partición temporal | L01,L10 | Orden cronológico sin información futura | P-L01 |
| C108 | Validación cruzada K-fold | L12 | Entrenar K modelos nuevos y agregar validación | P-L12 |
| C109 | Baseline de referencia | L09,L10 | Mayoría, media y mediana ajustadas con train | P-L09 |
| C110 | Semilla aleatoria | L01,L03 | Repetir pesos/datos y variar streams independientes | P-L03 |
| C111 | Reproducibilidad | L12 | Exportar/importar experimento y comparar resultados | P-L12 |
| C112 | Barajado de muestras | L06 | Inspeccionar Fisher–Yates por época | P-L06 |
| C113 | Covariate shift / deriva de entradas | L01,L12 | Cambiar p(x) conservando mecanismo objetivo | P-L12 |
| C114 | Concept drift / deriva del concepto | L10,L12 | Cambiar mecanismo p(y dado x) en cohorte posterior | P-L12 |
| C115 | Train-serving skew | L01,L12 | Mostrar error al usar pipeline distinto en inferencia | P-L12 |
| C116 | Categorías desconocidas | L01 | Enviar categoría no vista a columna reservada | P-L01 |
| C117 | Ingeniería de características | L01,L03 | Añadir cuadrado/log/producto con fórmula e IDs | P-L01 |
| C118 | Interacción entre características | L03,L10 | Comparar modelo con feature producto x1·x2 | P-L10 |
| C119 | Curva de aprendizaje por tamaño de train / learning curve | L08,L12 | Aumentar Ntrain con val fija y varias semillas | P-L12 |
| C120 | Calibración de probabilidades | L09 | Diagrama de fiabilidad con tamaño de bins | P-L09 |
| C121 | Puntuación Brier | L09 | Promediar error cuadrático de probabilidades | P-L09 |
| C122 | Curva ROC | L09 | Recorrer umbrales y pares FPR/TPR | P-L09 |
| C123 | ROC-AUC | L09 | Comparar ranking con empates y baseline | P-L09 |
| C124 | Curva precision-recall | L09 | Observar efecto de prevalencia | P-L09 |
| C125 | Average precision | L09 | Integrar por incrementos de recall sin confundir con trapecios | P-L09 |
| C126 | Umbral operativo | L09 | Elegir umbral en val antes de evaluar test | P-L09 |
| C127 | Coste de errores | L09 | Editar costes FP/FN y calcular coste medio | P-L09 |
| C128 | Coeficiente R² | L10 | Comparar contra media del conjunto evaluado y caso constante | P-L10 |
| C129 | RMSE y unidades de error | L10 | Relacionar raíz del MSE con unidad target | P-L10 |
| C130 | Residuos | L10 | Filtrar residuo y localizar muestra | P-L10 |
| C131 | Heterocedasticidad | L10 | Aumentar ruido dependiente de x y ver abanico | P-L10 |
| C132 | Extrapolación | L10 | Consultar fuera de soporte train con aviso | P-L10 |
| C133 | Escalado robusto | L01 | Comparar mediana/IQR con z-score y outliers | P-L01 |
| C134 | Gradient checking | L05 | Contrastar derivada analítica y numérica | P-L05 |
| C135 | Gradient clipping | L07,L08 | Medir norma antes/después sin alterar dirección | P-L08 |
| C136 | Estabilidad numérica | L04,L06 | Probar logits ±1.000 sin NaN ni overflow | P-L04 |
| C137 | Checkpoint | L06,L12 | Restaurar frontera de actualización confirmada | P-L12 |
| C138 | Estado del optimizador | L07,L12 | Comparar continuación con/sin momentos | P-L12 |
| C139 | Preprocesamiento dentro de cada fold | L01,L12 | Ajustar transformadores con train de cada fold | P-L12 |
| C140 | Dispersión predictiva e incertidumbre | L09,L12 | Comparar semillas y explicar límites de la dispersión | P-L12 |
| C141 | Regresión logística | L03,L09 | Red sin ocultas sigmoid/BCE frente al MLP en mismo split | P-L09 |
| C142 | Regresión lineal | L03,L10 | Salida lineal sin ocultas y residuos | P-L10 |
| C143 | K vecinos más próximos | L12 | Variar k, escala/distancia y frontera del comparador | P-L12 |
| C144 | Árbol de decisión y particiones | L12 | Inspeccionar splits, profundidad y hojas | P-L12 |
| C145 | Búsqueda de hiperparámetros | L12 | Rejilla acotada con presupuesto y val reservada para selección | P-L12 |
| C146 | Importancia por permutación | L12 | Barajar feature val y medir deterioro sin refit | P-L12 |
| C147 | Métricas por grupos y límites de equidad | L09 | Comparar soportes/errores por grupos sintéticos sin certificar justicia | P-L09 |
| C148 | Ética y contexto de decisión | L09 | Discutir costes FP/FN y límites del dataset | P-L09 |
| C149 | Representaciones aprendidas | L03,L06 | Mini-mapas de activación por neurona y combinación por capas | P-L06 |
| C150 | Interpretabilidad y causalidad | L12 | Explicar límites de contribuciones, mapas y permutación | P-L12 |
| C151 | Sesgo de selección de hiperparámetros | L12 | Comparar intentos de grid y conservar test fuera de selección | P-L12 |
| C152 | Diagnóstico por evidencia | L06,L08 | Contrastar alerta determinista con métricas/ventana y una intervención | P-L06 |

La [ampliación de consulta C153–C652](27-ampliacion-conceptos.md) añade 500 conceptos sin cambiar estas 152 filas. El catálogo alcanza 652 IDs; siguiente disponible C653. Estas fichas introductorias no satisfacen todavía el contrato completo de actividad interactiva descrito a continuación.

## Contrato para ampliar la lista

El catálogo se representa como registros declarativos, no como un enum TS ni un array de longitud fija. Identificador estable `C` seguido de al menos tres dígitos; el siguiente disponible inicialmente es C153. Nunca renumerar al reordenar o traducir. Un concepto retirado se marca deprecated y conserva redirect al sustituto.

Campos obligatorios: `id`, `slug`, `contentVersion`, `title.es`, `title.en`, `aliases` por locale, `category`, `level`, `definition`, `intuition` con límite de analogía, `formal`, `numericExample`, `relatedControls`, `frequentMistake`, `misconceptionPresetIds`, `selfAssessment`, `prerequisiteIds`, `relatedIds`, `labIds`, `activity`, `evidence`, `validationRefs`, `sources`, `targetRelease` y `status`. `numericExample` define fixture/valores, fórmula, dimensiones, unidades y bindings de snapshot si dinámico. `relatedControls` contiene labId/controlId; `selfAssessment` contiene prompt, tipo MCQ/VF, opciones, correctOptionIds, answer y explanation. `frequentMistake` incluye corrección y preset si existe. Campos editoriales localizados con fallback es; title.en/aliases permiten búsqueda inglesa sin fingir traducción completa de UI. Estados: proposed, specified, implemented, reviewed, deprecated. Las 152 filas están **specified**, no implemented. Pruebas y referencias son IDs declarativos, no scripts.

Añadir: registrar ID → validar slug/ID únicos y referencias → conectar experiencia existente o crear una especificación nueva → añadir evidencia/prueba → revisión pedagógica → publicar contenido. Se admiten nuevas categorías y etiquetas mediante registro validado, sin cambiar motor. Un concepto que requiera comportamiento matemático nuevo sí necesita desarrollar y probar ese comportamiento; el registro no crea una simulación por sí solo.

Paquetes: `format: neural-atlas.concept-pack`, schemaVersion, packId, version y concepts; **4 MiB UTF-8 y 500 registros por archivo**, límites simultáneos, sin prometer que 500 textos completos quepan. Máximo editorial por registro 32 KiB. No hay máximo global fijo. Conflicto de ID exige misma identidad y versión superior validada, con preview; nunca sobrescritura silenciosa. Contenido local se guarda en IDB, sujeto a presupuesto. Prerrequisitos sin ciclos; relatedIds pueden ser recíprocos. Búsqueda, grafo accesible y lista se generan del registro.

## Revisión pedagógica

No basta con aparecer en el glosario: cerrar un concepto exige actividad/evidencia y pregunta explicada reales. La revisión se hace por entrega según targetRelease, sin marcar como implementados los pendientes de v1.1/v1.2. No se usa accuracy para regresión; «precisión» sin apellido no sustituye a accuracy; z-score, min-max y BN se distinguen. Nombres fijos: **curva de pérdida por época** (C100), **curva de aprendizaje por tamaño train** (C119); «curva de validación» se reserva al rendimiento frente a un hiperparámetro.
