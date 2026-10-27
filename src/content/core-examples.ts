/** Static teaching examples and intentionally incorrect alternatives, keyed by stable concept ID. */
export const coreExamples: Record<number, readonly [string, string]> = {
  1: [
    'Una matriz con 4 filas y 2 columnas de entrada tiene dimensión4×2.',
    'La etiqueta que se intenta predecir debe incluirse siempre entre las features.',
  ],
  2: [
    'Las etiquetas [0,1,0] describen tres objetivos de clasificación binaria.',
    'Alterar unas etiquetas y renombrar globalmente ambas clases son siempre la misma operación.',
  ],
  3: [
    'De120 filas, un split60/20/20 asigna72 a train.',
    'Las estadísticas del pipeline deben aprenderse con todas las particiones.',
  ],
  4: [
    'En el split de120 filas, validación contiene24 y mide sin actualizar pesos.',
    'La validación debe contribuir al gradiente de cada mini-lote.',
  ],
  5: [
    'Un test de24 filas permanece reservado mientras se eligen configuraciones con validación.',
    'Consultar test repetidamente no influye en la independencia de la selección.',
  ],
  6: [
    'Las proporciones60/20/20 suman1 y asignan grupos de72/24/24 sobre120 casos.',
    'La misma fila puede pertenecer simultáneamente a train y test.',
  ],
  7: [
    'Con media2 y desviación2 aprendidas con train, x=6 se transforma en2.',
    'Z-score es exactamente lo mismo que Min-Max y que batch normalization.',
  ],
  8: [
    'Con min0 y max10 de train, x=15 se transforma en1,5.',
    'Min-Max garantiza que cualquier dato futuro queda entre cero y uno.',
  ],
  9: [
    'Cambiar un valor de2 a200 puede alterar mucho media y escala.',
    'Un valor extremo debe borrarse automáticamente aunque sea una observación válida.',
  ],
  10: [
    'Un ruido gaussiano σ=0,1 define dispersión de una receta, no un porcentaje fijo de etiquetas malas.',
    'Añadir ruido geométrico y alterar etiquetas son siempre la misma intervención.',
  ],
  11: [
    'El vector [0,8;0,2] contiene dos componentes con orden definido.',
    'Permutar las features no puede afectar a la predicción.',
  ],
  12: [
    'Tres categorías pueden representarse como [1,0,0], [0,1,0] y [0,0,1].',
    'Asignar códigos1,2,3 a categorías nominales no introduce ninguna relación artificial.',
  ],
  13: [
    'Una muestra con features [2,3] y objetivo7 mantiene el objetivo fuera del vector de inferencia.',
    'El objetivo debe introducirse como entrada aunque no esté disponible al predecir.',
  ],
  17: [
    'Con w=[1,0] y b=−0,5, la frontera es x₁=0,5.',
    'Cambiar solo el sesgo siempre gira una frontera de pesos fijos.',
  ],
  20: [
    'Con entradas0,8 y0,2, los pesos permanecen fijos al explorar una nueva consulta.',
    'Cambiar una entrada es una actualización de entrenamiento de los pesos.',
  ],
  21: [
    'Con x=[0,8;0,2], w=[0,5;−0,3] y b=0,1, z=0,44 y sigmoid(z)≈0,608259.',
    'La suma ponderada0,44 y su sigmoide0,608259 son el mismo valor.',
  ],
  22: [
    'El perceptrón sin ocultas no supera3/4 aciertos en XOR canónico.',
    'Un perceptrón siempre aprende XOR si se le dan más épocas.',
  ],
  23: [
    'Una red que recibe dos features transformadas tiene dos posiciones de entrada.',
    'La capa de entrada de este MLP añade por sí sola una matriz entrenable.',
  ],
  24: [
    'Una capa con cuatro unidades transforma una entrada de dimensión2 a una representación de dimensión4.',
    'Añadir capas garantiza que validación mejore en cualquier dataset.',
  ],
  25: [
    'La salida binaria tiene dimensión1; una salida multiclase de tres categorías tiene dimensión3.',
    'La dimensión de salida puede elegirse sin relacionarla con el objetivo.',
  ],
  26: [
    'Una transformación densa2→4 incluye8 pesos y4 sesgos.',
    'Una capa densa conecta solo cada neurona con la de su misma posición.',
  ],
  27: [
    'La contribución de w=−0,3 a x=0,2 es−0,06.',
    'Un peso mayor demuestra automáticamente una causa más importante.',
  ],
  28: [
    'Con w=[1,0], cambiar b de0 a−1 desplaza la frontera de x₁=0 a x₁=1.',
    'Modificar solo b cambia siempre la orientación de una recta con pesos fijos.',
  ],
  29: [
    'Una arista desde la entrada2 a la unidad3 representa un peso concreto W[3,2].',
    'Cada arista tiene un sesgo independiente en este MLP.',
  ],
  30: [
    'La topología2→4→1 produce17 parámetros densos sin BN.',
    'El número de capas determina por sí solo la capacidad y coste, sin importar su anchura.',
  ],
  31: [
    'Repetir semilla42 y la misma regla reproduce la inicialización del mismo modelo.',
    'Inicializar todas las unidades iguales garantiza romper sus simetrías.',
  ],
  32: [
    'Para fan_in=2 y fan_out=4, Xavier uniforme usa límite√(6/6)=1.',
    'Xavier usa siempre el mismo rango, independientemente de dimensiones.',
  ],
  33: [
    'Para fan_in=2, He uniforme usa límite√(6/2)=√3.',
    'La inicialización He elimina cualquier riesgo de ReLU inactiva.',
  ],
  34: [
    'Tasa0,01 y lote16 son configuración; el peso0,5 es un parámetro entrenable.',
    'La tasa de aprendizaje es un peso aprendido automáticamente por esta red.',
  ],
  35: [
    'Una red2→4→1 cuenta(2×4+4)+(4×1+1)=17 parámetros densos.',
    'Los sesgos nunca se cuentan entre los parámetros entrenables.',
  ],
  36: [
    'Pasar de una a ocho unidades ocultas cambia el conjunto de funciones representables y el coste.',
    'Una red con más parámetros generaliza siempre mejor.',
  ],
  37: [
    'Dos ReLU construyen |x| como max(0,x)+max(0,−x).',
    'El teorema de aproximación universal garantiza que Adam encontrará los parámetros adecuados.',
  ],
  38: [
    'La composición2→4→1 con tanh oculta y sigmoide final combina representaciones no lineales.',
    'Un MLP solo puede tener una única capa oculta por definición.',
  ],
  39: [
    'Para z=0, sigmoid(z)=0,5 y ReLU(z)=0.',
    'La activación de una neurona es siempre idéntica a su suma ponderada.',
  ],
  40: [
    'Componer y=2x+1 con z=3y−2 produce z=6x+1, todavía afín.',
    'Dos capas afines sin activación generan cualquier frontera curva.',
  ],
  41: ['En z=0, sigmoid vale0,5 y su derivada vale0,25.', 'La sigmoide de cero vale cero.'],
  42: [
    'tanh(0)=0 y su derivada en cero vale1.',
    'La salida de tanh siempre está entre cero y uno.',
  ],
  43: [
    'ReLU(−2)=0 y ReLU(3)=3.',
    'ReLU devuelve una cantidad negativa para toda entrada negativa.',
  ],
  44: [
    'Con α=0,01, Leaky ReLU(−2)=−0,02.',
    'Leaky ReLU es idéntica a ReLU en toda la región negativa.',
  ],
  45: [
    'Con logits [0,0], softmax devuelve [0,5;0,5] y suma1.',
    'Cada salida softmax depende exclusivamente de su propio logit.',
  ],
  46: [
    'Con la convención del laboratorio, el escalón vale1 cuando z=0.',
    'La derivada del escalón proporciona un gradiente útil ordinario para backprop.',
  ],
  47: [
    'Sigmoid(10)≈0,999955 y su derivada es mucho menor que0,25.',
    'Una activación saturada tiene siempre una derivada grande.',
  ],
  48: [
    'Una consulta recorre entrada, suma ponderada y activación antes de calcular la pérdida.',
    'Un forward pass actualiza necesariamente los pesos.',
  ],
  49: ['0,5×0,8−0,3×0,2+0,1=0,44.', 'El sesgo multiplica también la entrada antes de sumarse.'],
  50: [
    'Una salida0,7 puede producir etiqueta1 con umbral0,5 sin que la etiqueta real sea conocida.',
    'La predicción del modelo revela con certeza el objetivo real.',
  ],
  51: [
    'Con72 filas y lote12, una época contiene6 actualizaciones.',
    'Una época y una actualización son siempre el mismo contador.',
  ],
  52: [
    'El lote [a,b,c] contiene tres muestras cuyos gradientes se promedian antes del paso.',
    'Un lote debe contener siempre el dataset completo.',
  ],
  53: [
    'Al pasar de B=12 a B=24 con72 filas, los lotes por época pasan de6 a3.',
    'Cambiar el tamaño de lote no altera el número de actualizaciones por época.',
  ],
  54: [
    'Tres épocas de seis actualizaciones acumulan18 actualizaciones.',
    'Iteración, época y muestra son siempre sinónimos.',
  ],
  58: [
    'Para una unidad sigmoid/BCE con p≈0,608259 e y=1, la derivada respecto a z es aproximadamente−0,391741.',
    'Backprop y descenso de gradiente son exactamente la misma operación.',
  ],
  59: [
    'En L(w)=w², la derivada respecto a w en w=2 vale4.',
    'Una derivada parcial cambia simultáneamente todos los parámetros de forma arbitraria.',
  ],
  60: [
    'Si y=3u y u=2x, dy/dx=3×2=6.',
    'La regla de la cadena suma siempre las derivadas de las funciones compuestas.',
  ],
  61: [
    'Un gradiente [3,4] tiene norma euclídea5.',
    'El gradiente señala siempre la dirección de mayor descenso.',
  ],
  67: [
    'Con θ=1, η=0,1 y gradiente0,2, se obtiene θnuevo=0,98.',
    'Cada vez que se inspecciona una arista se debe aplicar de nuevo la actualización.',
  ],
  68: [
    'Dos errores cuadrados1 y9 tienen pérdida media5.',
    'Cualquier función de pérdida significa el mismo objetivo y las mismas unidades.',
  ],
  69: [
    'Para errores [1,−3], MSE=(1+9)/2=5.',
    'MSE tiene las mismas unidades que el objetivo sin transformación.',
  ],
  70: [
    'Para errores [1,−3], MAE=(1+3)/2=2.',
    'MAE penaliza cuadráticamente cada error antes de promediar.',
  ],
  71: [
    'Con y=1 y p=0,8, BCE=−log(0,8)≈0,22314.',
    'La BCE de una predicción correcta por umbral es siempre cero.',
  ],
  72: [
    'Si la probabilidad de la clase real es0,5, la entropía cruzada es−log(0,5)≈0,69315.',
    'En multiclase se ignora qué posición corresponde a la etiqueta real.',
  ],
  79: [
    'El producto de diez derivadas0,25 es aproximadamente9,54×10⁻⁷ en una cadena ilustrativa.',
    'Derivadas pequeñas repetidas conservan siempre una señal de gradiente grande.',
  ],
  80: [
    'Una cadena ilustrativa con factor2 repetido veinte veces produce factor1.048.576.',
    'Un gradiente enorme demuestra por sí solo cuál es la causa del problema.',
  ],
  101: [
    'Ajustar min/max train=[0,2] incluyendo una reserva100 cambia el escalado de2 desde1 a0,02.',
    'Una transformación sin etiquetas nunca puede producir fuga de información.',
  ],
  102: [
    'Con train [1,3,ausente], la imputación de media usa2 para el valor ausente.',
    'El imputador debe aprender su media con validación y test para ser correcto.',
  ],
  103: [
    'Dos copias relacionadas mantienen su groupId y no deben repartirse entre train y test.',
    'Una copia casi idéntica en test garantiza una evaluación independiente.',
  ],
  105: [
    'En100 casos con20 positivos, un split70/15/15 intenta repartirlos conservando proporciones y redondeos.',
    'La estratificación puede garantizar cualquier soporte mínimo aunque una clase tenga una sola fila.',
  ],
  106: [
    'Tres muestras del mismo grupo permanecen juntas al asignar ese grupo a una partición.',
    'Una entidad puede aparecer en train y test si sus filas se barajan antes.',
  ],
  107: [
    'Una partición temporal separa observaciones de enero para train y posteriores para evaluación.',
    'Barajar todos los meses conserva necesariamente una evaluación orientada al futuro.',
  ],
  110: [
    'Semilla42 en el mismo stream reproduce la misma secuencia bajo el mismo motor.',
    'Cambiar el ruido debe desplazar obligatoriamente el stream de inicialización.',
  ],
  116: [
    'Una categoría no vista usa la columna reservada de desconocidos, sin reconstruir el pipeline.',
    'Una categoría nueva exige recalcular todas las columnas usando la muestra de inferencia.',
  ],
};
