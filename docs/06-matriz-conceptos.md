# Trazabilidad de los 100 conceptos

Se conservan los números de la solicitud. La lista original omitía el 20: aquí se asigna **C020, datos de entrada (inputs)**, término que aparecía como cabecera. «Regresión numéricas» se normaliza a regresión numérica. Cada fila exige explicación intuitiva/formal, acción observable y evidencia. Las pruebas P-Lxx se concretan en el [plan de pruebas](13-pruebas-y-aceptacion.md); la tabla no implica que ya estén implementadas.

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
| C032 | Xavier/Glorot | L03 | Mostrar límite y varianza | P-L03 |
| C033 | He | L03 | Comparar propagación con ReLU | P-L03 |
| C034 | Hiperparámetros | L06 | Distinguir configuración y pesos | P-L06 |
| C035 | Parámetros entrenables | L03 | Contar W, b, gamma y beta | P-L03 |
| C036 | Capacidad | L08 | Comparar tamaños de red | P-L08 |
| C037 | Aproximación universal | L03 | Mostrar aproximación y límites del teorema | P-L03 |
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
| C089 | Data augmentation | L08,L11 | Transformar solo train | P-L08 |
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
| C100 | Learning/loss curve | L06,L08 | Ejes, split y registro por época | P-L06 |

## Revisión pedagógica

No basta con que un término aparezca en el glosario: para cerrar cada concepto se exige la acción/evidencia indicada y una pregunta de comprensión. En D3 se revisarán las 100 filas contra contenidos reales y pruebas. No se usa accuracy para regresión; «precisión» sin apellido no sustituye a accuracy; normalización z-score, min-max y batch normalization se distinguen explícitamente.
