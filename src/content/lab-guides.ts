export interface LabGuide {
  path: string;
  title: string;
  goal: string;
  read: string;
  formula: string;
  example: string;
  mistake: string;
  challenge: string;
  answer: string;
}
export const labGuides: readonly LabGuide[] = [
  {
    path: 'datos',
    title: 'Datos antes que modelos',
    goal: 'Separar qué se observa, qué se quiere predecir y qué información puede usarse para aprender.',
    read: 'Cada punto es una fila; los ejes muestran dos características. El color indica una etiqueta conocida, no la seguridad de una predicción. Un cambio de escala altera las distancias.',
    formula: 'X: N×d; y: N objetivos. Min-Max: (x−mín_train)/(máx_train−mín_train).',
    example:
      'Con mínimo train=10 y máximo train=30, un valor 20 se transforma en 0,5. Si aparece 40 en validación, da 1,5: no se vuelve a ajustar el rango usando validación.',
    mistake:
      'Escalar todos los datos antes del split permite que información de evaluación influya en la preparación.',
    challenge:
      'Genera datos, divídelos y compara una columna antes y después de escalar. Predice qué ocurrirá con un valor fuera del rango de train.',
    answer:
      'El pipeline se ajusta solo con train y se aplica igual a las otras particiones. El valor puede salir de [0,1]; no demuestra por sí solo un error del pipeline.',
  },
  {
    path: 'neurona',
    title: 'Una neurona, paso a paso',
    goal: 'Relacionar entradas, pesos, sesgo, suma y activación, distinguiendo cada operación.',
    read: 'Sigue primero los productos, después su suma con el sesgo y finalmente la función de activación. Una animación reproduce esas operaciones; no aprende pesos por sí misma.',
    formula: 'z=w₁x₁+w₂x₂+b; a=σ(z). x y w tienen d componentes; z y a son escalares.',
    example: 'Con x=(0,8;0,2), w=(0,5;−0,3), b=0,1: z=0,4−0,06+0,1=0,44 y σ(z)≈0,608259.',
    mistake:
      'Un peso negativo no significa que la característica sea mala: cambia su contribución a z según el signo y la escala de la entrada.',
    challenge:
      'Predice qué ocurrirá al aumentar b en 0,1 sin tocar las demás variables. Compruébalo y explica por qué la salida no aumenta exactamente 0,1.',
    answer:
      'z pasa a 0,54. Sigmoid transforma el cambio de forma no lineal: σ(0,54)≈0,631812. La pendiente local depende de z.',
  },
  {
    path: 'arquitectura',
    title: 'Capas y separación no lineal',
    goal: 'Entender por qué la representación y las funciones de activación afectan a lo que puede expresar una red.',
    read: 'Los nodos son unidades y las líneas son pesos; el signo y grosor describen parámetros. Más conexiones no garantizan que el optimizador encuentre una solución que generalice.',
    formula: 'Capa d→h: h(d+1) parámetros. Red 2→3→1: 3×3+1×4=13.',
    example:
      'XOR asigna 1 a (0,1) y (1,0), y 0 a (0,0) y (1,1). Una sola recta no separa ambas clases; una capa oculta no lineal puede construir otra representación.',
    mistake:
      'Apilar capas lineales sigue produciendo una transformación afín; aumentar su número no resuelve por sí solo XOR.',
    challenge:
      'Compara una red sin ocultas y otra con una capa oculta en XOR, manteniendo datos y protocolo. Predice qué limitación observarás.',
    answer:
      'La red lineal tiene una limitación de representación; la no lineal puede expresarlo. Que pueda hacerlo no garantiza convergencia con cualquier semilla, tasa o presupuesto.',
  },
  {
    path: 'activaciones',
    title: 'Forma de la activación y pendiente',
    goal: 'Vincular la transformación de una neurona con la señal que puede propagarse hacia atrás.',
    read: 'La gráfica de la función muestra la salida; la de su derivada muestra sensibilidad local. No confundas una salida grande con un gradiente grande.',
    formula: 'σ′(z)=σ(z)(1−σ(z)); ReLU′=0 para z<0 y 1 para z>0. En z=0 se declara una convención.',
    example:
      'En z=0, sigmoid vale 0,5 y su derivada 0,25. En zonas saturadas su pendiente se aproxima a cero, aunque la salida permanezca cerca de 1.',
    mistake:
      'Una derivada pequeña en una unidad no prueba por sí sola que toda la red tenga un problema: importan productos de derivadas, pesos y profundidad.',
    challenge:
      'Mueve z desde 0 hasta 8. Predice qué cambia más, la salida sigmoid o su sensibilidad. Después compara con ReLU.',
    answer:
      'Sigmoid se satura y su derivada disminuye. ReLU mantiene pendiente 1 en la parte positiva, aunque puede tener pendiente cero en entradas negativas.',
  },
  {
    path: 'propagacion',
    title: 'Del error a cada parámetro',
    goal: 'Seguir la regla de la cadena y comprobar que los gradientes tienen la forma de sus parámetros.',
    read: 'El recorrido hacia delante obtiene una predicción y una pérdida. El recorrido hacia atrás reparte sensibilidades; una flecha de retropropagación no es todavía una actualización de pesos.',
    formula: 'Si L=(wx−y)²: ∂L/∂w=2(wx−y)x. La actualización SGD resta η∂L/∂w.',
    example:
      'Con x=2, w=0,5 e y=3, la predicción es 1, L=4 y el gradiente es −8. Con η=0,1, w pasa a 1,3, no a −0,3.',
    mistake:
      'Usar el error como si fuera siempre el gradiente omite la sensibilidad de la salida respecto al parámetro.',
    challenge:
      'Antes de ejecutar el paso, determina el signo del cambio de w. Contrasta el gradiente analítico con la comprobación numérica.',
    answer:
      'El gradiente negativo hace aumentar w al restarlo. La comprobación por diferencias finitas aproxima la derivada y depende del tamaño de perturbación y del redondeo.',
  },
  {
    path: 'entrenamiento',
    title: 'Lotes, épocas y evaluación',
    goal: 'Distinguir cuánto se ha actualizado la red de cuántas veces se han recorrido los datos.',
    read: 'Cada lote actualiza parámetros; las curvas por época resumen evaluaciones registradas. Train sirve para aprender y validación para contrastar decisiones; test se reserva para la evaluación final.',
    formula:
      'Ntrain=80 y B=16: 5 actualizaciones por época. Con 10 épocas se prevén 50 si no hay parada temprana.',
    example:
      'Con gradiente g=−2 y tasa η=0,05, SGD cambia w en +0,1. Adam utiliza momentos y no tiene por qué producir ese mismo desplazamiento.',
    mistake:
      'Deshacer una configuración no recupera los pesos anteriores. Cambiar el optimizador tampoco conserva automáticamente el significado de sus momentos.',
    challenge:
      'Compara un lote y una época. Después modifica la tasa en una nueva configuración y explica qué tienes que reinicializar o recuperar.',
    answer:
      'Un lote hace una actualización; una época consume sus lotes. Para recuperar pesos y optimizador se necesita un checkpoint explícito, no solo la lista de ajustes.',
  },
  {
    path: 'optimizacion',
    title: 'Una posición, dos vistas del descenso',
    goal: 'Relacionar gradiente, dirección y desplazamiento real sobre una función de coste.',
    read: 'Los contornos 2D unen pérdidas iguales. La malla 3D añade la altura. El mismo índice muestra el mismo punto en ambas; la flecha normalizada indica dirección, no longitud del paso.',
    formula: 'θ′=θ−η∇L. Para L=x²+3y², ∇L=(2x,6y).',
    example:
      'En (1,1), con η=0,1, SGD propone (0,8;0,4); L cambia de 4 a 1,12. En la coordenada y, la multiplicación por 1−6η explica oscilación y estabilidad.',
    mistake:
      'Gradiente cero no equivale a mínimo. En x²−y² el origen es estacionario y hay direcciones con pérdida menor.',
    challenge:
      'Prepara el ejemplo de oscilación y luego el de divergencia. Predice qué verás en planta y en altura antes de calcular.',
    answer:
      'Una oscilación puede reducirse en amplitud y bajar la pérdida. Con tasa demasiado grande crece y puede salir del dominio; el programa lo registra como salida, sin recortar la trayectoria.',
  },
  {
    path: 'generalizacion',
    title: 'Aprender patrones y medir la brecha',
    goal: 'Separar ajuste a las muestras observadas de rendimiento en datos apartados.',
    read: 'Contrasta train y validación sobre el mismo protocolo. Una brecha sugiere preguntas sobre capacidad, ruido y distribución, pero no identifica una causa única.',
    formula:
      'Penalización L2 ilustrativa: λΣw²; su derivada respecto a w es 2λw bajo esta convención.',
    example:
      'Para w=2 y λ=0,1, la penalización es 0,4 y su contribución al gradiente es 0,4. La pérdida de datos y el objetivo regularizado deben distinguirse.',
    mistake:
      'Una pérdida train menor no demuestra mejor generalización; tampoco una única partición permite medir toda la variación del procedimiento.',
    challenge:
      'Mantén el split y compara una red pequeña con una más amplia, primero sin ruido y luego con ruido.',
    answer:
      'Capacidad, ruido y optimización pueden cambiar la brecha. Compara evidencias en validación y repite semillas; no elijas modelos mirando repetidamente el test.',
  },
  {
    path: 'clasificacion',
    title: 'Decisiones y denominadores',
    goal: 'Interpretar los errores por clase y distinguir accuracy de precision y recall.',
    read: 'En la matriz, identifica qué eje representa etiquetas reales y cuál predicciones. Cambiar un umbral cambia decisiones y recuentos, aunque las probabilidades guardadas sean las mismas.',
    formula:
      'Precision=TP/(TP+FP); recall=TP/(TP+FN); F1=2TP/(2TP+FP+FN). Denominadores cero requieren una convención explícita.',
    example:
      'Con TP=8, FP=2 y FN=4: precision=0,8, recall≈0,6667 y F1≈0,7273. Una accuracy agregada no permite reconstruir esos valores.',
    mistake:
      'Que el modelo dé 0,9 no demuestra que el 90 % de esas predicciones sean correctas: eso requiere estudiar calibración.',
    challenge:
      'Baja el umbral con las mismas probabilidades de validación. Predice qué tipos de errores pueden aumentar o disminuir.',
    answer:
      'En binaria, predecir más positivos puede elevar verdaderos y falsos positivos. Recall tiende a subir; precision depende de los casos añadidos.',
  },
  {
    path: 'regresion',
    title: 'Predicciones numéricas y residuos',
    goal: 'Leer dirección, tamaño y unidades de los errores numéricos.',
    read: 'La distancia vertical entre objetivo y predicción es un residuo. Una banda visual de puntos no es automáticamente un intervalo de confianza ni de predicción.',
    formula: 'MSE=Σ(ŷ−y)²/N; MAE=Σ|ŷ−y|/N. MSE usa unidades al cuadrado y MAE las originales.',
    example:
      'Para residuos [−1,2], MSE=(1+4)/2=2,5 y MAE=(1+2)/2=1,5. El signo desaparece en esas dos métricas.',
    mistake:
      'R² puede ser negativo si el modelo rinde peor que su referencia. No es una probabilidad ni una exactitud de clasificación.',
    challenge:
      'Añade un valor atípico y compara MSE y MAE manteniendo los mismos datos y predicciones.',
    answer:
      'MSE amplifica errores grandes mediante el cuadrado. Eso puede ser deseable o problemático según el objetivo; no hace que una métrica sea universalmente correcta.',
  },
  {
    path: 'vision',
    title: 'Del vecindario al mapa',
    goal: 'Entender qué calcula una ventana local y cómo stride, padding y pooling alteran la salida.',
    read: 'El inspector muestra productos y suma de la ventana seleccionada. El kernel se aplica como correlación cruzada; no se afirma que se esté entrenando una CNN.',
    formula: 'Salida espacial: floor((N+2P−K)/S)+1. Para N=5, K=3, P=0 y S=1, la salida es 3×3.',
    example:
      'Un kernel identidad con centro 1 y resto 0 devuelve el valor del píxel central de cada ventana válida. Un filtro de borde responde a cambios, no reconoce objetos completos.',
    mistake:
      'El tamaño del mapa no equivale a la cantidad de categorías detectadas. Max-pooling reduce resolución y conserva máximos locales bajo su regla.',
    challenge:
      'Predice el mapa del filtro identidad antes de aplicarlo. Después cambia stride y explica por qué cambian las posiciones visitadas.',
    answer:
      'La identidad conserva centros; stride mayor omite posiciones intermedias. Las dimensiones dependen de la fórmula, y los bordes requieren considerar padding.',
  },
  {
    path: 'experimentos',
    title: 'Una hipótesis y condiciones comunes',
    goal: 'Comparar intervenciones sin confundir efectos de datos, semillas, parámetros y presupuesto.',
    read: 'Antes de comparar, identifica qué permanece fijo y qué cambia. Los estudios copian la sesión; sus resultados no reemplazan automáticamente el modelo del laboratorio.',
    formula:
      'Diferencia emparejada: Δᵢ=métrica_B,ᵢ−métrica_A,ᵢ con el mismo protocolo por repetición.',
    example:
      'Si las pérdidas de A son [0,4;0,5] y las de B [0,3;0,55], las diferencias son [−0,1;0,05]. Hay mejora media de 0,025, pero no mejora en todas las repeticiones.',
    mistake:
      'Un solo resultado favorable no demuestra que el cambio sea siempre beneficioso ni que se haya aislado una causa.',
    challenge:
      'Escribe una predicción, cambia un factor y compara varias semillas o folds. Indica también qué evidencia contradiría tu hipótesis.',
    answer:
      'Describe qué factor cambió, los soportes y la variación. Mantén test fuera de selección; una explicación causal requiere supuestos y un diseño adicionales.',
  },
  {
    path: 'arquitectura/frontera',
    title: 'Sandbox de dos clases',
    goal: 'Observar cómo cambian las regiones de decisión al aprender y al modificar los ejemplos.',
    read: 'El fondo representa predicciones en una cuadrícula; los puntos son datos etiquetados. Una frontera suave o complicada describe este modelo y este entrenamiento, no una certeza universal.',
    formula:
      'En salida binaria, p=σ(z); con umbral 0,5, z=0 marca la frontera bajo esa convención.',
    example:
      'Si z=0, p=0,5. Al cambiar pesos o sesgo se desplaza el conjunto de entradas que cumple esa igualdad.',
    mistake:
      'Un contorno que rodea todos los puntos de train puede estar memorizando ruido. La frontera no prueba por sí sola buen rendimiento fuera de esas muestras.',
    challenge:
      'Compara dos lunas con ruido bajo y alto manteniendo la arquitectura. Predice dónde aparecerán ejemplos difíciles y contrástalo con validación.',
    answer:
      'El ruido hace menos nítida la relación entre posición y etiqueta. Más capacidad puede reducir el error train sin mejorar el protocolo de validación.',
  },
  {
    path: 'clasificacion/visual',
    title: 'Regiones que compiten entre varias clases',
    goal: 'Relacionar logits, softmax, probabilidades por clase y decisión final.',
    read: 'Cada color del mapa identifica la clase de mayor probabilidad. La red muestra una salida por clase y la sonda permite comparar sus valores para una misma entrada.',
    formula: 'pₖ=exp(zₖ−m)/Σⱼexp(zⱼ−m), con m=max z para estabilidad. Σpₖ=1.',
    example:
      'Con logits [0,0,0], las probabilidades son [1/3,1/3,1/3]. El empate se resuelve con la convención del modelo; no hay evidencia de alta confianza.',
    mistake:
      'Que las probabilidades sumen uno no implica calibración, ni que el modelo conozca una clase ausente del entrenamiento.',
    challenge:
      'Coloca una sonda cerca de la frontera entre dos regiones y otra en una zona alejada. Predice cómo cambiará la distribución softmax.',
    answer:
      'Pueden aparecer probabilidades cercanas entre clases en una frontera. Estar lejos de los datos también puede producir una salida extrema: hay que distinguir confianza numérica y conocimiento fiable.',
  },
  {
    path: 'experimentos/rejilla',
    title: 'Elegir entre muchos intentos',
    goal: 'Distinguir búsqueda de hiperparámetros, entrenamiento y evaluación final.',
    read: 'Una configuración solo es elegible cuando termina todas sus ejecuciones. La curva del mínimo describe selección en validación; no una mejora demostrada de generalización.',
    formula:
      'Ejecuciones = configuraciones × folds × semillas. Límite de este estudio: 9 configuraciones y 27 ejecuciones.',
    example:
      'Tres anchuras y dos tasas dan seis configuraciones. Con tres semillas son 18 ejecuciones; añadir tres folds daría 54 y excedería el límite.',
    mistake:
      'Seleccionar el mejor resultado y comunicarlo como estimación independiente ignora el uso repetido de validación.',
    challenge:
      'Prepara dos planes de distinto tamaño y predice qué pasará con el mínimo observado, sin consultar test.',
    answer:
      'Añadir opciones no aumenta el mínimo entre resultados ya observados, pero puede explotar variación de validación. Conserva todos los intentos y un protocolo independiente.',
  },
  {
    path: 'experimentos/importancia',
    title: 'Dependencia predictiva de una característica',
    goal: 'Medir deterioro al desordenar una columna sin volver a aprender pesos ni estadísticas.',
    read: 'El eje cero separa aumento y reducción de pérdida. Las barras muestran medias y dispersión entre permutaciones de validación, no efectos causales.',
    formula:
      'Importanciaⱼ = media(L_permutada,ⱼ−L_original). La desviación mostrada usa el denominador R−1.',
    example:
      'Si la pérdida original es 0,2 y las permutadas [0,3;0,4], los cambios son [0,1;0,2] y la importancia media 0,15.',
    mistake:
      'Una importancia baja puede deberse a un modelo malo o a características correlacionadas que se sustituyen entre sí; no prueba que la variable carezca de información.',
    challenge:
      'Usa el ejemplo correlacionado y compara las dos señales con el ruido independiente. Sigue una fila en el inspector.',
    answer:
      'La etiqueta y el resto de columnas permanecen; solo cambia el valor crudo elegido. El pipeline congelado recomputa derivadas, sin ajustarse a validación.',
  },
  {
    path: 'regresion/funciones',
    title: 'Construir una función con neuronas',
    goal: 'Ver cómo funciones simples se combinan para aproximar una relación no lineal.',
    read: 'La curva completa es la suma ponderada de contribuciones y sesgo. Las instantáneas muestran estados realmente registrados, no una interpolación que vuelva a entrenar.',
    formula: 'ŷ(x)=b+Σⱼvⱼaⱼ(x). Para dos contribuciones 0,4 y −0,1 y sesgo 0,2, ŷ=0,5.',
    example:
      'Aumentar neuronas permite más formas posibles, pero la aproximación obtenida depende de datos, activación, semilla y entrenamiento.',
    mistake:
      'Capacidad de aproximación no significa que se encuentre automáticamente una solución ni que se generalice fuera del intervalo observado.',
    challenge:
      'Compara una y varias neuronas en valor absoluto o seno. Explica qué tramos aproximan mejor y dónde falta evidencia.',
    answer:
      'Inspecciona contribuciones y residuos con el mismo conjunto de evaluación; no atribuyas a más neuronas una garantía universal.',
  },
  {
    path: 'clasificacion/etica',
    title: 'Errores, grupos y consecuencias',
    goal: 'Interpretar métricas por grupos junto a soportes, costes y contexto de decisión.',
    read: 'Compara recuentos y denominadores antes de comparar tasas. Un agregado ponderado puede ocultar dificultades de grupos pequeños.',
    formula:
      'Recall_g=TP_g/(TP_g+FN_g). Agregar exige sumar recuentos, no promediar tasas sin considerar soportes.',
    example:
      'Si un grupo tiene 9 aciertos de 10 y otro 1 de 2, la accuracy conjunta es 10/12≈0,8333; no el promedio simple 0,7 de sus tasas.',
    mistake:
      'Igualar una tasa no certifica justicia ni elimina sesgos en etiquetas, acceso o consecuencias. Distintas métricas pueden entrar en tensión.',
    challenge:
      'Compara dos políticas y explica a quién afectan sus falsos positivos y negativos. Indica qué información falta.',
    answer:
      'Expón costes, soporte y supuestos; la decisión sobre consecuencias requiere participación y contexto, no solo una puntuación.',
  },
  {
    path: 'experimentos/clasicos',
    title: 'Memorizar, dividir o aprender pesos',
    goal: 'Comparar mecanismos distintos bajo las mismas filas y el mismo preprocesado.',
    read: 'kNN consulta vecinos; CART recorre reglas; MLP aprende pesos. Sus contadores de coste no son la misma unidad ni equivalen automáticamente a tiempo.',
    formula:
      'kNN de regresión: promedio de k objetivos. Para [2,4,9], la predicción uniforme es 5.',
    example:
      'Con tres vecinos de etiquetas [1,1,0], el voto uniforme elige 1. Cambiar la escala puede cambiar esos vecinos aunque los puntos originales sean los mismos.',
    mistake:
      'Una frecuencia de votos o de hoja no garantiza calibración. Profundidad y k cambian la capacidad de forma diferente a añadir neuronas.',
    challenge:
      'Compara lunas con distintos k y profundidades. Predice cómo cambiarán las regiones y comprueba validación.',
    answer:
      'Mantén split y pipeline comunes, inspecciona los vecinos o la ruta y evita elegir el modelo mirando test.',
  },
];
export function guideForPath(path: string) {
  return [...labGuides]
    .sort((a, b) => b.path.length - a.path.length)
    .find((g) => path === `/lab/${g.path}` || path.startsWith(`/lab/${g.path}/`));
}
