# Ampliación del catálogo · 500 conceptos nuevos

Entrega 0.5.1. Se añaden **C153–C652**, organizados en **20 temas**. El catálogo abierto pasa de 152 a **652 conceptos previstos**. El glosario publica **569 fichas**: las 69 desarrolladas en D1–D3 y estas 500 fichas de consulta. Los 83 conceptos originales restantes conservan sus IDs y su planificación; no se consideran publicados.

Cada ficha nueva contiene un identificador estable, título en español e inglés, definición propia y alias de búsqueda cuando proceda. Son referencias introductorias: no incluyen todavía la actividad, ejemplo numérico, evaluación ni simulación exigidos para considerar un concepto interactivo completo. El nivel formal no inventa fórmulas para estas fichas. El entrenamiento general D4 conserva su entrega independiente.

## Uso y mantenimiento

El glosario permite buscar por español, inglés, alias e ID, filtrar por tema y tipo, recorrer páginas de 24 fichas y compartir enlaces como [C652](https://franmatias.github.io/neural-atlas/#/glosario?q=C652). Las coincidencias exactas de título e ID preceden a menciones dentro de definiciones. Cambiar filtros vuelve a la primera página; avanzar o retroceder coloca el foco en los resultados.

La fuente canónica es [extension-500.json](../src/content/catalog/extension-500.json), adaptada por [reference-concepts.ts](../src/content/reference-concepts.ts). No hay un máximo global. Próximo ID libre: **C653**. Nunca renumerar fichas al reordenarlas; para ampliar, añadir registros o importar un nuevo paquete en el adaptador, mantener IDs únicos y regenerar esta documentación con `node scripts/render-reference-catalog.mjs`. El control de 500 registros pertenece a la evidencia histórica de este paquete, no a una restricción del catálogo. El contrato completo de las actividades sigue en [la matriz original](06-matriz-conceptos.md).

Este documento se genera desde el JSON. `npm run docs:check` detecta desincronizaciones. Las pruebas verifican IDs, títulos y definiciones únicos, contenido no vacío, búsquedas, conservación de las 69 fichas anteriores, filtros, paginación, enlaces, teclado, accesibilidad y adaptación a 360/768/1440 px. La cobertura de código excluye el contenido declarativo, que tiene validaciones propias.

## Evidencia de la entrega

Validación local: 189 pruebas unitarias/integración; cobertura de líneas del 98,75 %. Los 40 recorridos E2E pasan en Chromium y WebKit (20 por motor), incluidos búsqueda, filtros, enlaces compartidos y accesibilidad del glosario en ambos temas. La adaptación se comprueba a 360, 768 y 1440 px. Firefox sigue siendo obligatorio en CI sobre Linux; la incidencia del motor local en Windows permanece documentada en D1/D2. El despliegue requiere además que CI supere sus 60 recorridos en los tres motores y la comprobación de la aplicación pública.

El contenido del glosario se descarga con su ruta: su paquete ocupa aproximadamente 40,4 KiB gzip; la transferencia inicial sigue en 57,9 KiB de JS y 11,4 KiB de CSS gzip, dentro del presupuesto. Se corrige también el espacio visible del logotipo para que coincida con su nombre accesible.

[Captura de escritorio claro](implementation/catalog-500-desktop.png) · [Captura de móvil oscuro](implementation/catalog-500-mobile.png). Capturas reales de esta entrega, revisadas visualmente.

## Referencias para profundizar

Las definiciones son síntesis originales. Estas fuentes primarias amplían los temas; no implican que todas sus técnicas estén implementadas:

- [Mathematics for Machine Learning](https://mml-book.github.io/): álgebra, cálculo, probabilidad y bases estadísticas.
- [Documentación de scikit-learn](https://scikit-learn.org/stable/user_guide.html): preprocesamiento, modelos clásicos, agrupación, reducción dimensional y evaluación.
- [Optimizadores de PyTorch](https://docs.pytorch.org/docs/stable/optim.html): algoritmos de actualización y regularización.
- [Attention Is All You Need](https://arxiv.org/abs/1706.03762): arquitectura Transformer y atención.
- [Denoising Diffusion Probabilistic Models](https://arxiv.org/abs/2006.11239): modelos de difusión.
- [VICReg](https://arxiv.org/abs/2105.04906): aprendizaje de representaciones sin contraste negativo explícito.
- [Reinforcement Learning: An Introduction](http://incompleteideas.net/book/the-book-2nd.html): decisiones secuenciales y aprendizaje por refuerzo.
- [Equality of Opportunity in Supervised Learning](https://arxiv.org/abs/1610.02413): distinción entre criterios de equidad y sus límites.

## Índice temático

| Tema | Identificadores | Fichas |
|---|---|---|
| Álgebra lineal y geometría | C153–C177 | 25 |
| Cálculo y métodos numéricos | C178–C202 | 25 |
| Probabilidad y distribuciones | C203–C227 | 25 |
| Inferencia y diseño estadístico | C228–C252 | 25 |
| Información y divergencias | C253–C277 | 25 |
| Datos, codificación y calidad | C278–C302 | 25 |
| Modelos supervisados y kernels | C303–C327 | 25 |
| Clustering y mezclas | C328–C352 | 25 |
| Reducción dimensional y variedades | C353–C377 | 25 |
| Ensembles y combinación de modelos | C378–C402 | 25 |
| Optimización avanzada | C403–C427 | 25 |
| Regularización y normalización avanzadas | C428–C452 | 25 |
| Convolución y visión artificial | C453–C477 | 25 |
| Secuencias y series temporales | C478–C502 | 25 |
| Atención, tokenización y transformers | C503–C527 | 25 |
| Modelos generativos y probabilísticos | C528–C552 | 25 |
| Aprendizaje de representaciones y supervisión limitada | C553–C577 | 25 |
| Aprendizaje por refuerzo | C578–C602 | 25 |
| Evaluación avanzada y causalidad | C603–C627 | 25 |
| MLOps, privacidad y responsabilidad | C628–C652 | 25 |

## Álgebra lineal y geometría

| ID | Concepto | Inglés | Definición |
|---|---|---|---|
| C153 | Producto de Hadamard | Hadamard product | Multiplicación elemento a elemento de matrices de igual forma; no suma sobre índices como el producto matricial. |
| C154 | Producto de Kronecker | Kronecker product | Construye una matriz por bloques multiplicando cada elemento de una matriz por todos los elementos de otra. |
| C155 | Producto exterior | Outer product | Combina dos vectores en una matriz cuyos elementos son todos los productos entre sus componentes. |
| C156 | Transpuesta de una matriz | Matrix transpose | Intercambia filas y columnas. En una capa densa permite expresar cómo se propagan contribuciones hacia las entradas. |
| C157 | Matriz identidad | Identity matrix | Matriz cuadrada con unos en la diagonal y ceros fuera; multiplicarla conserva un vector compatible. |
| C158 | Matriz diagonal | Diagonal matrix | Matriz cuyos elementos fuera de la diagonal son cero; representa escalados independientes de coordenadas. |
| C159 | Matriz simétrica | Symmetric matrix | Matriz cuadrada igual a su transpuesta; las covarianzas y las Hessianas suficientemente regulares tienen esta estructura. |
| C160 | Matriz ortogonal | Orthogonal matrix | Matriz real cuadrada cuya transpuesta es su inversa; conserva productos internos, distancias y normas euclídeas. |
| C161 | Matriz inversa | Matrix inverse | Transformación que deshace una matriz cuadrada invertible; no existe si sus columnas son linealmente dependientes. |
| C162 | Pseudoinversa de Moore–Penrose | Moore–Penrose pseudoinverse | Generaliza la inversa a matrices rectangulares o singulares y permite construir soluciones de mínimos cuadrados. |
| C163 | Rango matricial | Matrix rank | Número de columnas o filas linealmente independientes; limita cuántas direcciones distintas puede representar una transformación. |
| C164 | Traza matricial | Matrix trace | Suma de elementos diagonales de una matriz cuadrada; coincide con la suma de sus autovalores contando multiplicidades. |
| C165 | Determinante | Determinant | Factor orientado de cambio de volumen de una transformación cuadrada; un valor cero indica singularidad. |
| C166 | Autovalor | Eigenvalue | Escalar que describe el factor de cambio de un autovector cuando se aplica una transformación lineal. |
| C167 | Autovector | Eigenvector | Vector no nulo cuya dirección permanece en su misma recta después de aplicar una matriz. |
| C168 | Descomposición espectral | Spectral decomposition | Expresa una matriz diagonalizable mediante autovectores y autovalores; una matriz simétrica real admite una base ortonormal. |
| C169 | Descomposición en valores singulares | Singular value decomposition | Factoriza una matriz como UΣVᵀ y permite estudiar rango, aproximaciones de bajo rango y direcciones dominantes. |
| C170 | Norma infinito | Infinity norm | Para un vector, máximo valor absoluto de sus componentes; no equivale a sumar magnitudes. |
| C171 | Similitud coseno | Cosine similarity | Producto interno dividido por las normas de dos vectores no nulos; compara orientación sin medir directamente distancia. |
| C172 | Distancia de Mahalanobis | Mahalanobis distance | Mide separación teniendo en cuenta escalas y correlaciones mediante una matriz de covarianza invertible o regularizada. |
| C173 | Espacio columna | Column space | Subespacio formado por todas las combinaciones lineales de las columnas de una matriz. |
| C174 | Núcleo de una transformación | Null space | Conjunto de vectores que una transformación lineal envía al vector cero; identifica direcciones que pierde. |
| C175 | Base ortonormal | Orthonormal basis | Conjunto de vectores unitarios mutuamente ortogonales que genera un espacio, facilitando representar coordenadas y proyecciones. |
| C176 | Proyección ortogonal | Orthogonal projection | Componente de un vector en un subespacio que deja un residuo perpendicular a ese subespacio. |
| C177 | Número de condición | Condition number | Cuantifica sensibilidad relativa de un problema a perturbaciones; un valor elevado puede amplificar errores de datos o redondeo. |

## Cálculo y métodos numéricos

| ID | Concepto | Inglés | Definición |
|---|---|---|---|
| C178 | Matriz Jacobiana | Jacobian matrix | Agrupa todas las derivadas parciales de una función vectorial; cada fila corresponde a una componente de salida. |
| C179 | Matriz Hessiana | Hessian matrix | Matriz de segundas derivadas parciales de una función escalar; describe curvatura local bajo hipótesis de regularidad. |
| C180 | Operador laplaciano | Laplacian operator | Suma de segundas derivadas respecto a las coordenadas; aparece en suavizado, ecuaciones diferenciales y geometría. |
| C181 | Expansión de Taylor | Taylor expansion | Aproxima localmente una función usando derivadas en un punto; el error depende del orden y de la regularidad. |
| C182 | Derivada direccional | Directional derivative | Variación infinitesimal de una función al desplazarse siguiendo una dirección concreta desde un punto. |
| C183 | Diferencial total | Total differential | Aproximación lineal del cambio de una función diferenciable ante pequeñas variaciones simultáneas de sus entradas. |
| C184 | Regla del producto | Product rule | La derivada de un producto suma la derivada de cada factor multiplicada por los demás factores. |
| C185 | Regla del cociente | Quotient rule | Calcula la derivada de una razón de funciones donde el denominador no es cero. |
| C186 | Subgradiente | Subgradient | Generaliza ciertas derivadas en funciones convexas no diferenciables mediante pendientes de hiperplanos de soporte. |
| C187 | Convexidad | Convexity | Una función es convexa cuando su valor en una mezcla no supera la mezcla de valores; facilita garantías de optimización. |
| C188 | Convexidad estricta | Strict convexity | Exige desigualdad estricta entre puntos distintos; si existe un mínimo, garantiza su unicidad sobre un dominio convexo. |
| C189 | Convexidad fuerte | Strong convexity | Impone una cota cuadrática inferior de curvatura positiva, más exigente que la convexidad estricta. |
| C190 | Continuidad de Lipschitz | Lipschitz continuity | Acota cuánto puede cambiar una función respecto a la distancia entre entradas mediante una constante. |
| C191 | Suavidad del gradiente | Gradient smoothness | El gradiente es Lipschitz: su variación está acotada por la distancia entre parámetros. |
| C192 | Punto estacionario | Stationary point | Punto diferenciable con gradiente cero; puede ser mínimo, máximo o punto de silla. |
| C193 | Matriz definida positiva | Positive definite matrix | Matriz simétrica cuya forma cuadrática es positiva para cualquier vector no nulo. |
| C194 | Matriz semidefinida positiva | Positive semidefinite matrix | Su forma cuadrática nunca es negativa; permite direcciones con valor cero y no implica invertibilidad. |
| C195 | Diferenciación automática en modo directo | Forward-mode automatic differentiation | Propaga derivadas direccionales junto a los valores, útil cuando hay pocas entradas respecto a las salidas. |
| C196 | Diferenciación automática en modo inverso | Reverse-mode automatic differentiation | Acumula sensibilidades desde las salidas hacia entradas; resulta eficiente para pérdidas escalares con numerosos parámetros. |
| C197 | Producto Jacobiano-vector | Jacobian-vector product | Calcula la acción de una Jacobiana sobre un vector sin materializar necesariamente toda la matriz. |
| C198 | Producto vector-Jacobiano | Vector-Jacobian product | Propaga una combinación de sensibilidades de salida hacia entradas, operación central del modo inverso. |
| C199 | Diferenciación simbólica | Symbolic differentiation | Transforma expresiones algebraicas para obtener sus derivadas; difiere de evaluar una traza de operaciones numéricas. |
| C200 | Cancelación catastrófica | Catastrophic cancellation | Restar números cercanos puede perder cifras significativas y degradar cálculos derivados. |
| C201 | Suma compensada de Kahan | Kahan summation | Mantiene una corrección de redondeo para reducir el error acumulado al sumar números en coma flotante. |
| C202 | Subdesbordamiento numérico | Floating-point underflow | Un resultado demasiado pequeño puede representarse como subnormal o cero, alterando probabilidades y gradientes extremos. |

## Probabilidad y distribuciones

| ID | Concepto | Inglés | Definición |
|---|---|---|---|
| C203 | Probabilidad condicionada | Conditional probability | Probabilidad de un suceso al restringir el contexto a otro de probabilidad positiva. |
| C204 | Teorema de Bayes | Bayes theorem | Relaciona probabilidades condicionadas mediante verosimilitud, probabilidad previa y evidencia. |
| C205 | Independencia probabilística | Statistical independence | La distribución conjunta factoriza como producto de marginales; correlación cero no basta para demostrarla. |
| C206 | Independencia condicionada | Conditional independence | Dos variables se vuelven independientes al conocer una tercera; no implica independencia sin ese condicionamiento. |
| C207 | Regla de la probabilidad total | Law of total probability | Obtiene una probabilidad sumando probabilidades condicionadas sobre una partición ponderadas por sus probabilidades. |
| C208 | Regla de la cadena probabilística | Probability chain rule | Factoriza una distribución conjunta en un producto de probabilidades condicionadas ordenadas. |
| C209 | Variable aleatoria discreta | Discrete random variable | Asigna valores de un conjunto numerable a resultados aleatorios, con masas de probabilidad que suman uno. |
| C210 | Variable aleatoria continua | Continuous random variable | Se describe mediante una densidad en el caso absolutamente continuo; la probabilidad de un punto individual es cero. |
| C211 | Función de distribución acumulada | Cumulative distribution function | Da la probabilidad de que una variable aleatoria sea menor o igual que un umbral. |
| C212 | Función de densidad | Probability density function | Su integral sobre una región produce probabilidades; su valor puntual puede superar uno. |
| C213 | Esperanza matemática | Expected value | Promedio teórico ponderado por la distribución de una variable, cuando la integral correspondiente existe. |
| C214 | Varianza poblacional | Population variance | Esperanza de la desviación cuadrática respecto a la media; mide dispersión en unidades al cuadrado. |
| C215 | Covarianza | Covariance | Esperanza del producto de desviaciones respecto a las medias; describe asociación lineal con signo y escala. |
| C216 | Correlación de Pearson | Pearson correlation | Covarianza normalizada por las desviaciones típicas; mide asociación lineal y no demuestra causalidad. |
| C217 | Distribución de Bernoulli | Bernoulli distribution | Modela una observación con dos resultados mediante una probabilidad de éxito. |
| C218 | Distribución binomial | Binomial distribution | Cuenta éxitos en un número fijo de ensayos Bernoulli independientes con la misma probabilidad. |
| C219 | Distribución categórica | Categorical distribution | Modela una observación entre un número finito de categorías mediante un vector de probabilidades. |
| C220 | Distribución multinomial | Multinomial distribution | Modela los recuentos de categorías en varios ensayos categóricos independientes con probabilidades constantes. |
| C221 | Distribución normal | Normal distribution | Familia continua determinada por media y varianza, con densidad simétrica en forma de campana. |
| C222 | Distribución de Poisson | Poisson distribution | Modela recuentos no negativos con media igual a varianza bajo sus supuestos. |
| C223 | Distribución exponencial | Exponential distribution | Modela tiempos no negativos entre sucesos de un proceso de Poisson homogéneo y tiene falta de memoria. |
| C224 | Distribución beta | Beta distribution | Familia sobre el intervalo entre cero y uno, útil para representar incertidumbre sobre una probabilidad. |
| C225 | Distribución de Dirichlet | Dirichlet distribution | Familia sobre vectores de probabilidades que generaliza la distribución beta a varias categorías. |
| C226 | Ley de los grandes números | Law of large numbers | Bajo condiciones adecuadas, el promedio muestral se aproxima a la esperanza al aumentar las observaciones. |
| C227 | Teorema central del límite | Central limit theorem | Bajo sus hipótesis, la suma o media estandarizada tiende a una distribución normal, no necesariamente los datos originales. |

## Inferencia y diseño estadístico

| ID | Concepto | Inglés | Definición |
|---|---|---|---|
| C228 | Muestra aleatoria simple | Simple random sample | Diseño en el que todas las muestras del tamaño fijado tienen igual probabilidad de selección. |
| C229 | Estimador estadístico | Statistical estimator | Regla que convierte una muestra en una estimación de un parámetro poblacional. |
| C230 | Sesgo de un estimador | Estimator bias | Diferencia entre la esperanza de un estimador y el parámetro que estima; no es el sesgo de una neurona. |
| C231 | Consistencia estadística | Statistical consistency | El estimador se aproxima al parámetro verdadero al aumentar el tamaño muestral bajo los supuestos del modelo. |
| C232 | Eficiencia de un estimador | Estimator efficiency | Compara la variabilidad de estimadores para un mismo objetivo dentro de una clase y supuestos determinados. |
| C233 | Intervalo de confianza | Confidence interval | Procedimiento que cubre el parámetro en una proporción fijada de muestras repetidas bajo sus supuestos. |
| C234 | Error estándar | Standard error | Desviación típica de la distribución muestral de un estimador; no es la dispersión de las observaciones individuales. |
| C235 | Hipótesis nula | Null hypothesis | Afirmación de referencia contra la que se evalúa la compatibilidad de los datos en una prueba. |
| C236 | Hipótesis alternativa | Alternative hypothesis | Conjunto de situaciones que la prueba contrapone a la hipótesis nula. |
| C237 | Valor p | P-value | Probabilidad, suponiendo la hipótesis nula, de un estadístico tan extremo o más que el observado. |
| C238 | Nivel de significación | Significance level | Cota prefijada para la probabilidad de rechazar una hipótesis nula verdadera en el diseño de una prueba. |
| C239 | Error de tipo I | Type I error | Rechazar la hipótesis nula cuando es verdadera; su control requiere respetar el procedimiento de prueba. |
| C240 | Error de tipo II | Type II error | No rechazar la hipótesis nula bajo una alternativa concreta cuando es falsa. |
| C241 | Potencia estadística | Statistical power | Probabilidad de rechazar la hipótesis nula bajo una alternativa especificada; depende del efecto y del tamaño muestral. |
| C242 | Tamaño del efecto | Effect size | Magnitud de una diferencia o asociación; un valor p pequeño no garantiza que el efecto tenga relevancia práctica. |
| C243 | Prueba t | T-test | Familia de contrastes sobre medias que utiliza una distribución t bajo hipótesis específicas. |
| C244 | ANOVA | Analysis of variance | Contrasta diferencias entre medias comparando variabilidad entre grupos y dentro de grupos bajo un modelo. |
| C245 | Prueba de chi-cuadrado | Chi-squared test | Compara frecuencias observadas y esperadas para estudiar ajuste o asociación bajo condiciones de aproximación. |
| C246 | Prueba de permutación | Permutation test | Construye una distribución nula reordenando etiquetas o asignaciones bajo un supuesto de intercambiabilidad válido. |
| C247 | Remuestreo bootstrap | Bootstrap resampling | Aproxima variabilidad de un estimador mediante muestras con reemplazo de los datos observados. |
| C248 | Jackknife | Jackknife | Estudia la sensibilidad de un estimador al retirar observaciones o grupos de forma sistemática. |
| C249 | Corrección de Bonferroni | Bonferroni correction | Controla el error familiar ajustando el umbral de cada contraste según el número de pruebas. |
| C250 | Tasa de descubrimientos falsos | False discovery rate | Esperanza de la proporción de rechazos incorrectos entre todos los rechazos, con una convención para ausencia de rechazos. |
| C251 | Procedimiento de Benjamini–Hochberg | Benjamini–Hochberg procedure | Controla la tasa de descubrimientos falsos ordenando valores p bajo condiciones sobre su dependencia. |
| C252 | Tamaño muestral efectivo | Effective sample size | Número orientativo de observaciones independientes equivalentes cuando existen dependencia, ponderación o autocorrelación. |

## Información y divergencias

| ID | Concepto | Inglés | Definición |
|---|---|---|---|
| C253 | Entropía de Shannon | Shannon entropy | Incertidumbre media de una distribución discreta; la base del logaritmo fija si se mide en bits o nats. |
| C254 | Entropía diferencial | Differential entropy | Análogo basado en densidades continuas; puede ser negativa y cambia al transformar las unidades. |
| C255 | Entropía condicionada | Conditional entropy | Incertidumbre residual de una variable al conocer otra, promediada sobre los valores de la condición. |
| C256 | Entropía conjunta | Joint entropy | Incertidumbre de una distribución conjunta; no es siempre la suma de las entropías marginales. |
| C257 | Información mutua | Mutual information | Cuantifica dependencia comparando la distribución conjunta con el producto de marginales. |
| C258 | Información mutua condicionada | Conditional mutual information | Mide dependencia entre dos variables después de condicionar en una tercera. |
| C259 | Divergencia de Kullback–Leibler | Kullback–Leibler divergence | Diferencia informativa dirigida entre distribuciones compatibles; no es simétrica ni una distancia métrica. |
| C260 | Divergencia de Jensen–Shannon | Jensen–Shannon divergence | Promedia divergencias hacia una distribución mezcla y es simétrica; su raíz define una métrica. |
| C261 | Divergencia de Rényi | Rényi divergence | Familia parametrizada de discrepancias entre distribuciones que recupera KL como límite bajo condiciones adecuadas. |
| C262 | Divergencia de Bregman | Bregman divergence | Discrepancia inducida por una función convexa diferenciable al comparar su valor con una aproximación tangente. |
| C263 | Distancia de variación total | Total variation distance | Máxima diferencia de probabilidad que dos distribuciones asignan a un mismo suceso. |
| C264 | Distancia de Hellinger | Hellinger distance | Compara raíces cuadradas de probabilidades o densidades; es simétrica y acotada bajo su convención habitual. |
| C265 | Distancia de Wasserstein | Wasserstein distance | Coste óptimo de transportar masa de una distribución a otra según una distancia base. |
| C266 | Transporte óptimo | Optimal transport | Busca un acoplamiento entre distribuciones que minimice un coste de desplazamiento de masa. |
| C267 | Divergencia de chi-cuadrado | Chi-squared divergence | Compara distribuciones ponderando discrepancias cuadráticas por la distribución de referencia. |
| C268 | Divergencia f | F-divergence | Familia de discrepancias construidas integrando una función convexa de la razón entre densidades. |
| C269 | Desigualdad de Gibbs | Gibbs inequality | Establece la no negatividad de KL cuando está bien definida y su igualdad para distribuciones coincidentes. |
| C270 | Desigualdad de procesamiento de datos | Data processing inequality | Procesar una observación mediante una cadena de Markov no aumenta su información mutua sobre la fuente. |
| C271 | Desigualdad de Fano | Fano inequality | Relaciona la incertidumbre condicionada de una etiqueta finita con la probabilidad de error de un estimador. |
| C272 | Principio de máxima entropía | Maximum entropy principle | Elige la distribución de mayor entropía entre las que satisfacen restricciones explícitas. |
| C273 | Cuello de botella informativo | Information bottleneck | Busca una representación que comprima la entrada conservando información relevante para una variable objetivo. |
| C274 | Longitud mínima de descripción | Minimum description length | Compara modelos por la longitud necesaria para codificar el modelo y los datos mediante él. |
| C275 | Complejidad de Kolmogórov | Kolmogorov complexity | Longitud del programa más corto que genera un objeto en una máquina universal fijada; no es computable en general. |
| C276 | Información puntual mutua | Pointwise mutual information | Compara la probabilidad conjunta de dos resultados con el producto de sus probabilidades marginales mediante un logaritmo. |
| C277 | Información propia | Self-information | Sorpresa de un suceso de probabilidad positiva, definida como el logaritmo negativo de su probabilidad. |

## Datos, codificación y calidad

| ID | Concepto | Inglés | Definición |
|---|---|---|---|
| C278 | Faltantes completamente aleatorios | Missing completely at random | El mecanismo de ausencia no depende de valores observados ni no observados; es una hipótesis fuerte, no comprobable solo por intuición. |
| C279 | Faltantes aleatorios condicionados | Missing at random | La ausencia puede depender de variables observadas, pero no de valores faltantes una vez condicionado en aquellas. |
| C280 | Faltantes no aleatorios | Missing not at random | La ausencia depende de información no observada incluso tras condicionar en los datos disponibles. |
| C281 | Imputación por vecinos | KNN imputation | Estima un valor ausente usando observaciones cercanas según una distancia y características disponibles. |
| C282 | Imputación múltiple | Multiple imputation | Genera varios datasets plausibles para reflejar incertidumbre de faltantes y combinar posteriormente las estimaciones. |
| C283 | Imputación iterativa encadenada | Chained equations imputation | Modela sucesivamente cada variable incompleta a partir de otras, según un esquema iterativo y supuestos explícitos. |
| C284 | Variable nominal | Nominal variable | Categoría sin orden intrínseco; asignarle enteros no justifica interpretar distancias entre códigos. |
| C285 | Variable ordinal | Ordinal variable | Categoría con orden, pero sin garantía de que las separaciones entre niveles sean iguales. |
| C286 | Codificación ordinal | Ordinal encoding | Asigna números a categorías ordenadas o codificadas; el modelo puede interpretar relaciones numéricas no justificadas. |
| C287 | Codificación binaria de categorías | Binary encoding | Representa un identificador categórico mediante varios bits, reduciendo columnas frente a una codificación indicadora completa. |
| C288 | Codificación por frecuencia | Frequency encoding | Sustituye una categoría por su frecuencia estimada exclusivamente en el conjunto de ajuste permitido. |
| C289 | Codificación del objetivo por categoría | Target encoding | Resume el objetivo por categoría; requiere estrategias como ajuste fuera de pliegue para evitar fuga. |
| C290 | Codificación por hashing | Feature hashing | Asigna características a un espacio de dimensión fija usando una función hash; pueden producirse colisiones. |
| C291 | Discretización por intervalos | Binning | Agrupa valores continuos en rangos; los límites deben aprenderse sin usar información de evaluación. |
| C292 | Discretización por cuantiles | Quantile binning | Construye intervalos con frecuencias aproximadamente similares en los datos de ajuste, salvo empates y otras restricciones. |
| C293 | Winsorización | Winsorization | Sustituye valores extremos por umbrales fijados; modifica observaciones y debe distinguirse de eliminarlas. |
| C294 | Transformación logarítmica | Log transformation | Comprime escalas positivas mediante un logaritmo; cambia la interpretación de diferencias y requiere un dominio válido. |
| C295 | Transformación Box–Cox | Box–Cox transformation | Familia de potencias para variables estrictamente positivas, con parámetro estimado sobre los datos de ajuste. |
| C296 | Transformación Yeo–Johnson | Yeo–Johnson transformation | Familia de potencias relacionada con Box–Cox que admite valores cero y negativos. |
| C297 | Transformación por rangos | Rank transformation | Sustituye magnitudes por posiciones relativas; conserva orden, pero pierde información sobre distancias originales. |
| C298 | Test de integridad referencial | Referential integrity check | Verifica que identificadores relacionados apunten a registros válidos y no a referencias inexistentes o ambiguas. |
| C299 | Restricción de unicidad | Uniqueness constraint | Exige que una clave identifique un único registro dentro del ámbito definido. |
| C300 | Cardinalidad categórica | Categorical cardinality | Número de valores distintos de una variable categórica; condiciona memoria, codificación y soporte por categoría. |
| C301 | Valores centinela | Sentinel values | Códigos especiales usados para representar estados como ausencia; deben distinguirse de mediciones numéricas válidas. |
| C302 | Diccionario de datos | Data dictionary | Documenta significado, unidades, tipos, dominios permitidos y procedencia de las variables de un dataset. |

## Modelos supervisados y kernels

| ID | Concepto | Inglés | Definición |
|---|---|---|---|
| C303 | Máquina de vectores de soporte | Support vector machine | Clasificador que busca separación con margen y penaliza violaciones según una formulación y un parámetro de regularización. |
| C304 | Margen geométrico | Geometric margin | Distancia entre observaciones y una frontera separadora, normalizada respecto a la escala de sus coeficientes. |
| C305 | Truco del kernel | Kernel trick | Calcula productos internos en un espacio de características implícito sin construir explícitamente sus coordenadas. |
| C306 | Kernel gaussiano RBF | Gaussian RBF kernel | Mide similitud como una exponencial decreciente de la distancia cuadrática; su anchura controla localidad. |
| C307 | Kernel polinómico | Polynomial kernel | Construye similitudes que corresponden a combinaciones polinómicas de características bajo parámetros determinados. |
| C308 | Kernel de Mercer | Mercer kernel | Kernel que, bajo hipótesis del teorema de Mercer, admite una representación espectral asociada a un operador positivo. |
| C309 | Regresión de vectores de soporte | Support vector regression | Ajusta una función mediante una pérdida con zona de tolerancia y una penalización de complejidad. |
| C310 | Pérdida épsilon-insensible | Epsilon-insensitive loss | No penaliza errores dentro de una banda épsilon y penaliza el exceso fuera de ella. |
| C311 | Naive Bayes | Naive Bayes | Familia de clasificadores generativos que asume independencia condicional de características dado el objetivo. |
| C312 | Naive Bayes gaussiano | Gaussian naive Bayes | Modela cada característica continua mediante una normal específica de clase dentro del supuesto condicional de Naive Bayes. |
| C313 | Naive Bayes multinomial | Multinomial naive Bayes | Modela recuentos o frecuencias no negativas por clase, utilizado frecuentemente con representaciones de texto. |
| C314 | Naive Bayes Bernoulli | Bernoulli naive Bayes | Modela características binarias como indicadores de presencia o ausencia bajo independencia condicional. |
| C315 | Análisis discriminante lineal | Linear discriminant analysis | Clasificador generativo con distribuciones normales por clase y covarianza compartida, que induce fronteras lineales. |
| C316 | Análisis discriminante cuadrático | Quadratic discriminant analysis | Permite una covarianza distinta por clase en un modelo normal, generando fronteras cuadráticas. |
| C317 | Regresión por procesos gaussianos | Gaussian process regression | Define una distribución sobre funciones mediante media y kernel para predecir valores e incertidumbre bajo el modelo. |
| C318 | Clasificación por procesos gaussianos | Gaussian process classification | Combina una función latente gaussiana con una verosimilitud de clasificación, normalmente requiriendo inferencia aproximada. |
| C319 | Modelo lineal generalizado | Generalized linear model | Relaciona la media de una distribución de la familia exponencial con un predictor lineal mediante una función de enlace. |
| C320 | Función de enlace | Link function | Transforma la media condicional de un modelo lineal generalizado a la escala del predictor lineal. |
| C321 | Regresión de Poisson | Poisson regression | Modelo para recuentos con media condicional normalmente conectada al predictor mediante un enlace logarítmico. |
| C322 | Regresión binomial negativa | Negative binomial regression | Modelo de recuentos que permite variabilidad superior a la media mediante un parámetro adicional. |
| C323 | Regresión cuantílica | Quantile regression | Estima cuantiles condicionados del objetivo en lugar de limitarse a su media. |
| C324 | Regresión ordinal | Ordinal regression | Modela un objetivo categórico ordenado conservando su estructura de niveles. |
| C325 | Modelo probit | Probit model | Relaciona una probabilidad binaria con un predictor mediante la función de distribución normal estándar. |
| C326 | Modelo de riesgos proporcionales de Cox | Cox proportional hazards model | Modelo de supervivencia que supone razones de riesgo constantes entre perfiles según sus covariables. |
| C327 | Modelo de tiempo de fallo acelerado | Accelerated failure time model | Expresa cómo las covariables escalan el tiempo hasta un evento bajo una distribución y relación especificadas. |

## Clustering y mezclas

| ID | Concepto | Inglés | Definición |
|---|---|---|---|
| C328 | K-means | K-means | Asigna puntos a centroides para reducir distancias euclídeas cuadráticas internas; depende de inicialización, escala y número de grupos. |
| C329 | K-means++ | K-means++ | Inicializa centroides de forma probabilística favoreciendo puntos alejados de los ya seleccionados. |
| C330 | K-medoids | K-medoids | Representa cada grupo mediante una observación real y puede utilizar disimilitudes distintas de la euclídea. |
| C331 | Clustering jerárquico aglomerativo | Agglomerative clustering | Comienza con grupos pequeños y los fusiona sucesivamente según una regla de enlace. |
| C332 | Clustering jerárquico divisivo | Divisive clustering | Parte de un grupo amplio y lo divide recursivamente siguiendo un criterio de separación. |
| C333 | Enlace simple | Single linkage | Define distancia entre grupos como la menor distancia entre un par de observaciones de ambos grupos. |
| C334 | Enlace completo | Complete linkage | Define distancia entre grupos mediante el par de observaciones más separado entre ambos. |
| C335 | Enlace promedio | Average linkage | Promedia distancias entre pares de observaciones de dos grupos para decidir sus fusiones. |
| C336 | Criterio de Ward | Ward linkage | Fusiona grupos buscando el menor incremento de variación interna cuadrática bajo su geometría euclídea. |
| C337 | Dendrograma | Dendrogram | Árbol que representa fusiones o divisiones jerárquicas y permite inspeccionar agrupaciones a distintas alturas. |
| C338 | DBSCAN | DBSCAN | Agrupa regiones densas mediante una vecindad y un mínimo de puntos, dejando algunas observaciones como ruido. |
| C339 | HDBSCAN | HDBSCAN | Construye una jerarquía de densidad y selecciona agrupaciones estables, tolerando diferencias de densidad mejor que un único umbral. |
| C340 | OPTICS | OPTICS | Ordena observaciones según conectividad de densidad para explorar agrupaciones a varias escalas de vecindad. |
| C341 | Mean Shift | Mean Shift | Desplaza candidatos hacia modos de densidad estimada; la anchura del kernel determina la escala de agrupación. |
| C342 | Clustering espectral | Spectral clustering | Usa autovectores de una representación de afinidad para agrupar estructuras que pueden no ser convexas. |
| C343 | Propagación de afinidad | Affinity propagation | Intercambia mensajes entre observaciones para seleccionar ejemplos representativos y sus grupos. |
| C344 | Modelo de mezcla gaussiana | Gaussian mixture model | Representa una distribución mediante componentes normales con pesos, medias y covarianzas específicos. |
| C345 | Algoritmo esperanza-maximización | Expectation maximization | Alterna expectativas de variables latentes con optimización de parámetros para aumentar una cota o la verosimilitud. |
| C346 | Responsabilidad de una componente | Mixture responsibility | Probabilidad posterior de que una componente de mezcla explique una observación según el modelo actual. |
| C347 | Mezcla bayesiana de procesos de Dirichlet | Dirichlet process mixture | Modelo de mezcla bayesiano cuyo prior permite un número no fijado de componentes potenciales. |
| C348 | Coeficiente de silueta | Silhouette coefficient | Compara cohesión de cada punto con separación respecto a otro grupo usando disimilitudes definidas. |
| C349 | Índice de Davies–Bouldin | Davies–Bouldin index | Resume similitud entre grupos según dispersión interna y separación; valores menores suelen indicar mayor separación bajo esa geometría. |
| C350 | Índice de Calinski–Harabasz | Calinski–Harabasz index | Compara dispersión entre grupos y dentro de grupos ajustando por sus tamaños y número. |
| C351 | Índice Rand ajustado | Adjusted Rand index | Compara dos particiones corrigiendo coincidencias esperadas bajo un modelo de azar; puede tomar valores negativos. |
| C352 | Información mutua normalizada de particiones | Normalized mutual information | Compara dos asignaciones de grupos mediante información compartida y una regla explícita de normalización. |

## Reducción dimensional y variedades

| ID | Concepto | Inglés | Definición |
|---|---|---|---|
| C353 | Análisis de componentes principales | Principal component analysis | Busca direcciones ortogonales de máxima varianza sobre datos centrados; la escala de las variables influye en el resultado. |
| C354 | PCA incremental | Incremental PCA | Actualiza una aproximación de componentes principales por bloques para limitar memoria en datasets grandes. |
| C355 | PCA disperso | Sparse PCA | Busca componentes con pocos coeficientes activos, sacrificando propiedades del PCA ordinario según la formulación. |
| C356 | PCA con kernel | Kernel PCA | Aplica una construcción de componentes principales en un espacio implícito definido por un kernel. |
| C357 | SVD truncada | Truncated SVD | Conserva un número limitado de componentes singulares para aproximar una matriz, frecuentemente sin centrar matrices dispersas. |
| C358 | Factorización matricial no negativa | Non-negative matrix factorization | Aproxima una matriz no negativa con factores también no negativos, favoreciendo representaciones aditivas. |
| C359 | Análisis de componentes independientes | Independent component analysis | Busca componentes estadísticamente independientes bajo supuestos de mezcla, más exigentes que decorrelación. |
| C360 | Análisis factorial | Factor analysis | Modela covarianzas mediante factores latentes y ruido específico; no equivale a maximizar varianza explicada como PCA. |
| C361 | Escalado multidimensional | Multidimensional scaling | Construye coordenadas de baja dimensión que aproximan distancias o disimilitudes entre objetos. |
| C362 | Isomap | Isomap | Estima distancias geodésicas mediante un grafo de vecinos y aplica escalado multidimensional sobre ellas. |
| C363 | Embedding localmente lineal | Locally linear embedding | Preserva relaciones de reconstrucción lineal local al buscar coordenadas de menor dimensión. |
| C364 | Mapas propios laplacianos | Laplacian eigenmaps | Construyen una representación usando autovectores del laplaciano de un grafo de vecindad. |
| C365 | t-SNE | t-distributed stochastic neighbor embedding | Construye una visualización que prioriza vecindades mediante distribuciones de similitud; distancias globales requieren cautela. |
| C366 | Perplejidad de t-SNE | t-SNE perplexity | Controla una escala efectiva de vecindad basada en la entropía de las afinidades locales. |
| C367 | Problema de aglomeración | Crowding problem | Al reducir dimensión puede faltar espacio para preservar simultáneamente separaciones entre numerosas vecindades. |
| C368 | UMAP | Uniform manifold approximation and projection | Construye y optimiza una representación de un grafo de relaciones locales bajo supuestos geométricos del método. |
| C369 | Proyección aleatoria | Random projection | Reduce dimensión mediante una transformación aleatoria que puede preservar aproximadamente distancias bajo condiciones adecuadas. |
| C370 | Lema de Johnson–Lindenstrauss | Johnson–Lindenstrauss lemma | Garantiza una proyección de conjuntos finitos a dimensión menor que preserva distancias euclídeas dentro de una tolerancia. |
| C371 | Blanqueamiento de datos | Whitening | Transforma datos para obtener covarianza identidad bajo la estimación usada; puede amplificar direcciones de varianza pequeña. |
| C372 | Hipótesis de variedad | Manifold hypothesis | Supone que datos de alta dimensión se concentran cerca de una estructura de dimensión intrínseca menor. |
| C373 | Dimensión intrínseca | Intrinsic dimension | Número de grados de libertad necesarios para describir localmente o globalmente una estructura de datos. |
| C374 | Hubness | Hubness | Fenómeno por el que algunas observaciones aparecen como vecinas de muchas otras, especialmente en ciertos espacios de alta dimensión. |
| C375 | Análisis topológico de datos | Topological data analysis | Estudia estructuras como componentes, ciclos y cavidades para caracterizar la forma de los datos. |
| C376 | Homología persistente | Persistent homology | Sigue la aparición y desaparición de características topológicas al variar una escala de construcción. |
| C377 | Aproximación Barnes–Hut | Barnes–Hut approximation | Agrupa interacciones lejanas mediante una estructura jerárquica para acelerar ciertos cálculos, incluido un algoritmo de t-SNE. |

## Ensembles y combinación de modelos

| ID | Concepto | Inglés | Definición |
|---|---|---|---|
| C378 | Bagging | Bagging | Combina modelos ajustados sobre remuestras para reducir variabilidad cuando sus errores no están completamente correlacionados. |
| C379 | Boosting | Boosting | Construye una combinación secuencial de modelos en la que cada etapa atiende al objetivo definido por las anteriores. |
| C380 | AdaBoost | AdaBoost | Repondera ejemplos para enfatizar errores de etapas previas y combina clasificadores con pesos aprendidos. |
| C381 | Gradient boosting | Gradient boosting | Añade modelos que aproximan direcciones de descenso de una pérdida en el espacio de funciones. |
| C382 | Bosque aleatorio | Random forest | Combina árboles con aleatoriedad de muestras y características para diversificar sus errores. |
| C383 | Árboles extremadamente aleatorizados | Extra Trees | Introduce aleatoriedad adicional en umbrales de partición al construir un ensemble de árboles. |
| C384 | XGBoost | XGBoost | Sistema de boosting de árboles con objetivo regularizado y aproximaciones que utilizan información de derivadas de la pérdida. |
| C385 | LightGBM | LightGBM | Implementación de boosting de árboles basada en histogramas y estrategias eficientes de crecimiento y muestreo. |
| C386 | CatBoost | CatBoost | Sistema de boosting que incorpora tratamiento de variables categóricas y estrategias ordenadas para reducir determinados sesgos de ajuste. |
| C387 | Votación dura | Hard voting | Combina decisiones de clasificadores mediante recuento de votos, con una regla explícita para los empates. |
| C388 | Votación blanda | Soft voting | Combina probabilidades de varios clasificadores y decide a partir del vector agregado. |
| C389 | Stacking | Stacking | Entrena un metamodelo sobre predicciones de modelos base, generadas fuera de muestra para evitar fuga. |
| C390 | Blending | Blending | Ajusta un combinador de modelos usando predicciones sobre un conjunto de reserva separado. |
| C391 | Evaluación fuera de bolsa | Out-of-bag evaluation | Usa observaciones no seleccionadas en una remuestra bootstrap para evaluar sus modelos asociados. |
| C392 | Submuestreo de características por nodo | Node-wise feature subsampling | Limita aleatoriamente los predictores candidatos en cada partición de un árbol para diversificar sus decisiones. |
| C393 | Método de subespacios aleatorios | Random subspace method | Ajusta modelos sobre subconjuntos de características y combina sus resultados. |
| C394 | Códigos correctores de errores para clasificación | Error-correcting output codes | Transforma un problema multiclase en varios problemas binarios definidos por palabras de código. |
| C395 | Selección dinámica de ensembles | Dynamic ensemble selection | Elige modelos o sus pesos para cada consulta según una estimación local de competencia. |
| C396 | Diversidad del ensemble | Ensemble diversity | Diferencia entre respuestas o errores de modelos; más diversidad no garantiza por sí sola mejor rendimiento. |
| C397 | Aprendiz débil | Weak learner | Modelo cuyo rendimiento satisface una ventaja limitada frente a una referencia bajo los supuestos de un algoritmo de boosting. |
| C398 | Tocón de decisión | Decision stump | Árbol de una sola partición, usado como componente simple en algunos ensembles. |
| C399 | Aprendizaje con correlación negativa | Negative correlation learning | Añade objetivos que buscan reducir correlación de errores entre miembros de una combinación. |
| C400 | Ensemble de snapshots | Snapshot ensemble | Combina estados de un entrenamiento guardados en distintos momentos, buscando diversidad sin entrenar todos desde cero. |
| C401 | Promedio bayesiano de modelos | Bayesian model averaging | Combina predicciones ponderando modelos por sus probabilidades posteriores bajo un marco bayesiano. |
| C402 | Mezcla de expertos | Mixture of experts | Combina expertos mediante una función de enrutamiento que puede asignar contribuciones diferentes a cada entrada. |

## Optimización avanzada

| ID | Concepto | Inglés | Definición |
|---|---|---|---|
| C403 | AdamW | AdamW | Separa el decaimiento de pesos de los momentos adaptativos de Adam; no equivale a añadir L2 a su gradiente. |
| C404 | Momento de Nesterov | Nesterov momentum | Usa una corrección anticipada de la dirección de movimiento; su formulación debe distinguirse del momentum clásico. |
| C405 | Adagrad | Adagrad | Escala actualizaciones por coordenada usando la suma acumulada de gradientes cuadrados; sus tasas efectivas tienden a disminuir. |
| C406 | Adadelta | Adadelta | Adapta actualizaciones mediante promedios móviles de gradientes cuadrados y de cambios previos. |
| C407 | NAdam | NAdam | Combina adaptación por momentos de Adam con una modificación inspirada en el momento de Nesterov. |
| C408 | AMSGrad | AMSGrad | Variante de Adam que conserva máximos de estimaciones de segundo momento para controlar determinados comportamientos de adaptación. |
| C409 | Lion | Lion optimizer | Optimizador que utiliza signos de combinaciones de gradiente y momento para definir la dirección de actualización. |
| C410 | L-BFGS | Limited-memory BFGS | Aproxima información de curvatura mediante un historial limitado de diferencias de parámetros y gradientes. |
| C411 | Método de Newton | Newton method | Usa gradiente y Hessiana para construir un paso local; requiere tratar singularidad, coste y posibles curvaturas indefinidas. |
| C412 | Método de Gauss–Newton | Gauss–Newton method | Aproxima la Hessiana de objetivos de mínimos cuadrados mediante productos de Jacobianas. |
| C413 | Gradiente natural | Natural gradient | Ajusta la dirección de descenso según una métrica del espacio de distribuciones, frecuentemente basada en información de Fisher. |
| C414 | Matriz de información de Fisher | Fisher information matrix | Describe sensibilidad local de una familia probabilística mediante momentos de las derivadas del logaritmo de su densidad. |
| C415 | Búsqueda de línea | Line search | Elige una longitud de paso evaluando un objetivo o condiciones a lo largo de una dirección. |
| C416 | Condiciones de Wolfe | Wolfe conditions | Criterios de descenso suficiente y curvatura empleados para aceptar pasos en ciertas búsquedas de línea. |
| C417 | Método de región de confianza | Trust-region method | Optimiza un modelo local dentro de una zona donde se considera suficientemente fiable. |
| C418 | Gradiente conjugado | Conjugate gradient | Resuelve ciertos sistemas lineales simétricos definidos positivos mediante direcciones conjugadas sin invertir explícitamente la matriz. |
| C419 | Gradiente proximal | Proximal gradient | Combina un paso sobre una parte suave del objetivo con un operador proximal para otra parte. |
| C420 | Descenso por coordenadas | Coordinate descent | Actualiza parámetros o bloques de ellos manteniendo los demás fijos durante cada subproblema. |
| C421 | Algoritmo de Frank–Wolfe | Frank–Wolfe algorithm | Optimiza sobre un conjunto convexo mediante subproblemas lineales y combinaciones convexas, evitando ciertas proyecciones. |
| C422 | Paso de Polyak | Polyak step size | Relaciona la longitud de paso con la diferencia respecto al valor óptimo y la norma del gradiente bajo una formulación específica. |
| C423 | Tasa de aprendizaje cíclica | Cyclical learning rate | Hace variar la tasa entre límites según ciclos definidos, en lugar de reducirla siempre monótonamente. |
| C424 | Política de un ciclo | One-cycle policy | Programa una subida y bajada principal de la tasa, a menudo acompañada de variaciones del momento. |
| C425 | Calentamiento de tasa | Learning-rate warmup | Incrementa gradualmente la tasa al inicio para moderar actualizaciones tempranas. |
| C426 | Reinicios cálidos del scheduler | Warm restarts | Reinicia un calendario de tasas sin necesariamente reinicializar los parámetros del modelo. |
| C427 | Optimización de segundo orden | Second-order optimization | Utiliza información de curvatura exacta o aproximada además del gradiente para construir actualizaciones. |

## Regularización y normalización avanzadas

| ID | Concepto | Inglés | Definición |
|---|---|---|---|
| C428 | Normalización espectral | Spectral normalization | Restringe o reescala una matriz según su mayor valor singular, controlando la amplificación lineal que produce. |
| C429 | Normalización de pesos | Weight normalization | Reparametriza un vector de pesos separando su magnitud y dirección para modificar la geometría del ajuste. |
| C430 | Normalización por capa | Layer normalization | Normaliza características dentro de cada ejemplo según ejes definidos, sin depender de estadísticas de otros ejemplos del lote. |
| C431 | Normalización por instancia | Instance normalization | Normaliza cada ejemplo y canal sobre sus dimensiones espaciales en usos habituales de visión. |
| C432 | Normalización por grupos | Group normalization | Divide canales en grupos y normaliza estadísticas dentro de cada grupo de cada ejemplo. |
| C433 | RMSNorm | RMS normalization | Reescala activaciones mediante su raíz cuadrática media sin restar explícitamente la media. |
| C434 | Suavizado de etiquetas | Label smoothing | Sustituye objetivos categóricos rígidos por distribuciones suavizadas; altera el objetivo de entrenamiento. |
| C435 | Mixup | Mixup | Entrena con combinaciones convexas de entradas y de sus etiquetas bajo una política de mezcla. |
| C436 | CutMix | CutMix | Combina regiones de imágenes y mezcla etiquetas según la proporción de área sustituida. |
| C437 | Cutout | Cutout | Oculta regiones de una imagen durante entrenamiento para reducir dependencia de señales locales concretas. |
| C438 | SpecAugment | SpecAugment | Aplica transformaciones como máscaras temporales y de frecuencia a representaciones espectrales de audio. |
| C439 | DropConnect | DropConnect | Enmascara conexiones o pesos durante entrenamiento, en contraste con enmascarar activaciones completas. |
| C440 | Dropout espacial | Spatial dropout | Elimina grupos estructurados de activaciones, como mapas de características completos, en vez de elementos independientes. |
| C441 | Profundidad estocástica | Stochastic depth | Omite bloques de una red durante entrenamiento según una política aleatoria, manteniendo una regla coherente de inferencia. |
| C442 | Restricción max-norm | Max-norm constraint | Limita la norma de determinados vectores de pesos mediante proyección o reescalado. |
| C443 | Regularización ortogonal | Orthogonal regularization | Penaliza desviaciones respecto a relaciones de ortogonalidad entre vectores o matrices de parámetros. |
| C444 | Regularización de Jacobiana | Jacobian regularization | Penaliza sensibilidades de las salidas respecto a entradas o representaciones para promover suavidad local. |
| C445 | Entrenamiento adversarial | Adversarial training | Ajusta el modelo usando perturbaciones elegidas para aumentar su pérdida dentro de restricciones definidas. |
| C446 | Destilación de conocimiento | Knowledge distillation | Entrena un estudiante usando información de un modelo docente, como probabilidades suavizadas o representaciones. |
| C447 | Autodestilación | Self-distillation | Transfiere información entre etapas, versiones o partes relacionadas de un mismo proceso de entrenamiento. |
| C448 | Hipótesis del billete de lotería | Lottery ticket hypothesis | Propone que ciertas redes contienen subredes que pueden entrenarse eficazmente con inicializaciones adecuadas. |
| C449 | Regularización implícita | Implicit regularization | Preferencias del procedimiento de ajuste que influyen en la solución sin aparecer como penalización explícita. |
| C450 | Doble descenso | Double descent | Patrón en el que el error de evaluación puede volver a disminuir tras una región asociada a interpolación. |
| C451 | Minimización consciente de agudeza | Sharpness-aware minimization | Optimiza considerando un vecindario de parámetros para favorecer soluciones con buen comportamiento local del objetivo. |
| C452 | Cotas PAC-Bayes | PAC-Bayes bounds | Relacionan riesgo y complejidad de distribuciones sobre hipótesis bajo supuestos probabilísticos y una elección de prior. |

## Convolución y visión artificial

| ID | Concepto | Inglés | Definición |
|---|---|---|---|
| C453 | Convolución unidimensional | One-dimensional convolution | Aplica filtros compartidos sobre una dimensión, como tiempo o posición de una secuencia. |
| C454 | Convolución bidimensional | Two-dimensional convolution | Desplaza filtros sobre dos dimensiones espaciales; las bibliotecas suelen implementar correlación cruzada bajo este nombre. |
| C455 | Convolución tridimensional | Three-dimensional convolution | Extiende el filtrado a tres ejes, útil para volúmenes o patrones espaciotemporales. |
| C456 | Convolución agrupada | Grouped convolution | Divide canales en grupos y restringe las conexiones del filtro dentro de cada grupo. |
| C457 | Convolución separable en profundidad | Depthwise separable convolution | Combina filtrado independiente por canal con mezcla puntual de canales para reducir operaciones. |
| C458 | Convolución transpuesta | Transposed convolution | Aplica la transformación lineal transpuesta de una convolución configurada; no es en general su inversa. |
| C459 | Convolución dilatada | Dilated convolution | Separa posiciones del filtro mediante huecos para ampliar campo receptivo sin aumentar todos sus parámetros. |
| C460 | Convolución puntual | Pointwise convolution | Usa filtros espaciales de tamaño uno para mezclar canales en cada posición. |
| C461 | Campo receptivo | Receptive field | Región de la entrada que puede influir en una activación determinada de la red. |
| C462 | Paso espacial de filtro | Stride | Desplazamiento entre posiciones sucesivas del filtro; afecta resolución de salida y cobertura. |
| C463 | Correlación cruzada | Cross-correlation | Combina un filtro con desplazamientos de una señal sin invertir el filtro como en la convolución matemática. |
| C464 | Pooling promedio | Average pooling | Resume regiones tomando la media de sus activaciones bajo una ventana y un paso definidos. |
| C465 | Pooling promedio global | Global average pooling | Promedia cada canal sobre todas sus posiciones espaciales para obtener una representación compacta. |
| C466 | ResNet | Residual network | Arquitectura que introduce caminos de identidad o proyección para aprender transformaciones residuales entre bloques. |
| C467 | DenseNet | DenseNet | Conecta bloques mediante concatenación de características de capas anteriores, favoreciendo reutilización de representaciones. |
| C468 | U-Net | U-Net | Arquitectura de codificador y decodificador con conexiones entre escalas, utilizada en segmentación y otras tareas. |
| C469 | Bloque Inception | Inception block | Combina ramas de procesamiento a distintas escalas y concatena sus características. |
| C470 | Transformador de visión | Vision Transformer | Procesa representaciones de parches de imagen mediante bloques de atención y otras transformaciones. |
| C471 | Pirámide de características | Feature pyramid network | Combina información de diferentes resoluciones para producir representaciones multiescala. |
| C472 | ROI Align | ROI Align | Extrae características de regiones usando interpolación y evitando determinados redondeos de límites espaciales. |
| C473 | Intersección sobre unión | Intersection over union | Divide el área o volumen compartido por dos regiones entre el de su unión. |
| C474 | Supresión no máxima | Non-maximum suppression | Elimina detecciones redundantes atendiendo a puntuaciones y solapamientos bajo una política definida. |
| C475 | Segmentación semántica | Semantic segmentation | Asigna una clase a cada píxel o posición sin distinguir necesariamente instancias separadas de la misma clase. |
| C476 | Segmentación de instancias | Instance segmentation | Distingue objetos individuales y asigna una máscara a cada instancia detectada. |
| C477 | Detección de objetos | Object detection | Localiza objetos y estima sus clases, normalmente mediante regiones o cajas con puntuaciones asociadas. |

## Secuencias y series temporales

| ID | Concepto | Inglés | Definición |
|---|---|---|---|
| C478 | Red neuronal recurrente | Recurrent neural network | Mantiene un estado que se actualiza al procesar una secuencia y permite representar dependencias temporales. |
| C479 | LSTM | Long short-term memory | Celda recurrente con compuertas y estado de memoria que regula conservación y actualización de información. |
| C480 | GRU | Gated recurrent unit | Unidad recurrente con compuertas de actualización y reinicio que combina memoria y estado en una formulación compacta. |
| C481 | Retropropagación a través del tiempo | Backpropagation through time | Despliega una red recurrente a lo largo de pasos temporales para calcular gradientes de sus parámetros compartidos. |
| C482 | Retropropagación temporal truncada | Truncated BPTT | Limita la longitud temporal por la que se propagan gradientes, reduciendo coste y alcance de dependencia. |
| C483 | Teacher forcing | Teacher forcing | Durante entrenamiento suministra al siguiente paso el objetivo previo en lugar de la predicción generada. |
| C484 | Muestreo programado en secuencias | Scheduled sampling | Alterna entradas previas reales y generadas siguiendo una política durante entrenamiento autorregresivo. |
| C485 | Modelo secuencia a secuencia | Sequence-to-sequence model | Transforma una secuencia de entrada en otra secuencia que puede tener longitud distinta. |
| C486 | Red recurrente bidireccional | Bidirectional recurrent network | Combina procesamiento hacia delante y hacia atrás; requiere disponibilidad del contexto futuro utilizado. |
| C487 | Clasificación temporal conexionista | Connectionist temporal classification | Define una pérdida para secuencias sin alineación temporal explícita usando símbolos de blanco y suma de alineaciones. |
| C488 | Búsqueda en haz | Beam search | Conserva varios prefijos candidatos en cada paso de generación; no garantiza hallar la secuencia globalmente más probable. |
| C489 | Decodificación voraz | Greedy decoding | Selecciona la opción local de mayor puntuación en cada paso sin reconsiderar elecciones anteriores. |
| C490 | Algoritmo de Viterbi | Viterbi algorithm | Encuentra la secuencia de estados de mayor puntuación en modelos con estructura de dependencia adecuada. |
| C491 | Modelo oculto de Markov | Hidden Markov model | Describe observaciones emitidas por estados latentes que evolucionan mediante transiciones markovianas. |
| C492 | Campo aleatorio condicional | Conditional random field | Modela una distribución condicionada de etiquetas estructuradas dadas observaciones mediante factores y normalización. |
| C493 | Propiedad de Markov | Markov property | El futuro es independiente del pasado al condicionar en un estado que resume la información pertinente. |
| C494 | Autocorrelación | Autocorrelation | Asociación entre valores de una señal separados por un desfase temporal. |
| C495 | Estacionariedad débil | Weak stationarity | Exige media constante y covarianza que dependa del desfase, con segundos momentos finitos. |
| C496 | ARIMA | Autoregressive integrated moving average | Combina términos autorregresivos, diferenciación y media móvil para modelar series temporales. |
| C497 | SARIMA | Seasonal ARIMA | Añade componentes estacionales autorregresivos, de diferenciación y de media móvil a un modelo ARIMA. |
| C498 | Vector autorregresivo | Vector autoregression | Modela varias series mediante dependencias lineales de sus propios retardos y de los de otras series. |
| C499 | Descomposición estacional | Seasonal decomposition | Separa una serie en componentes como tendencia, estacionalidad y residuo bajo una estructura elegida. |
| C500 | Red convolucional temporal | Temporal convolutional network | Usa convoluciones, frecuentemente causales y dilatadas, para representar dependencias en secuencias. |
| C501 | Alineamiento temporal dinámico | Dynamic time warping | Busca una correspondencia no lineal entre posiciones de dos secuencias mediante un coste acumulado. |
| C502 | Horizonte de predicción | Forecast horizon | Distancia temporal entre el momento de emitir una predicción y el instante que se quiere anticipar. |

## Atención, tokenización y transformers

| ID | Concepto | Inglés | Definición |
|---|---|---|---|
| C503 | Autoatención | Self-attention | Calcula representaciones de una secuencia usando consultas, claves y valores derivados de esa misma secuencia. |
| C504 | Atención cruzada | Cross-attention | Relaciona consultas de una representación con claves y valores procedentes de otra. |
| C505 | Atención por producto escalar escalado | Scaled dot-product attention | Pondera valores mediante softmax de productos consulta-clave divididos por una escala, habitualmente la raíz de la dimensión. |
| C506 | Atención multicabeza | Multi-head attention | Combina varias operaciones de atención sobre proyecciones aprendidas para representar relaciones distintas. |
| C507 | Máscara causal | Causal attention mask | Impide atender a posiciones futuras no disponibles en una tarea autorregresiva. |
| C508 | Máscara de relleno | Padding mask | Evita que posiciones añadidas solo para igualar longitudes contribuyan como contenido válido. |
| C509 | Codificación posicional | Positional encoding | Introduce información sobre posiciones u orden que una atención sin esa señal no identifica por sí sola. |
| C510 | Embedding posicional rotatorio | Rotary position embedding | Aplica rotaciones dependientes de posición a consultas y claves para incorporar relaciones posicionales en sus productos. |
| C511 | ALiBi | Attention with linear biases | Añade sesgos dependientes de distancia a puntuaciones de atención para incorporar información posicional. |
| C512 | Caché de claves y valores | Key-value cache | Reutiliza claves y valores de tokens ya procesados durante generación, intercambiando cómputo por memoria. |
| C513 | Atención de consultas agrupadas | Grouped-query attention | Varias cabezas de consulta comparten grupos de cabezas de claves y valores. |
| C514 | Atención multiconsulta | Multi-query attention | Comparte una cabeza de claves y valores entre varias cabezas de consulta para reducir memoria de caché. |
| C515 | Codificador transformer | Transformer encoder | Bloque o conjunto de bloques que construye representaciones contextualizadas mediante atención y transformaciones por posición. |
| C516 | Decodificador transformer | Transformer decoder | Procesa secuencias con restricciones de atención apropiadas a generación; puede incluir atención cruzada según la arquitectura. |
| C517 | Transformer codificador-decodificador | Encoder-decoder transformer | Combina un codificador de entrada con un decodificador que atiende a sus representaciones. |
| C518 | Prenormalización | Pre-norm transformer | Coloca normalización antes de los subbloques de atención o transformación dentro de una conexión residual. |
| C519 | Posnormalización | Post-norm transformer | Coloca normalización después de combinar un subbloque con su conexión residual. |
| C520 | Bloque feed-forward del transformer | Transformer feed-forward block | Transformación por posición que suele expandir y contraer dimensión mediante capas aprendidas y una no linealidad. |
| C521 | Conexión residual | Residual connection | Suma una señal de entrada a la salida de una transformación compatible para crear un camino alternativo. |
| C522 | Embedding de token | Token embedding | Vector aprendido o construido que representa un símbolo del vocabulario; no equivale necesariamente a una palabra completa. |
| C523 | Codificación por pares de bytes | Byte-pair encoding | Tokenización basada en fusiones sucesivas de unidades frecuentes; las variantes definen de forma concreta su unidad inicial. |
| C524 | SentencePiece | SentencePiece | Sistema de tokenización que puede aprender unidades subléxicas a partir de texto sin una segmentación previa en palabras. |
| C525 | Tokenizador unigram | Unigram tokenizer | Selecciona segmentaciones mediante un modelo de probabilidades de unidades subléxicas y una estrategia de aprendizaje del vocabulario. |
| C526 | Ventana de contexto | Context window | Cantidad de posiciones que un modelo puede procesar en una configuración; no garantiza uso fiable de toda la información. |
| C527 | Complejidad cuadrática de atención | Quadratic attention complexity | La atención densa completa compara pares de posiciones, haciendo crecer su matriz de puntuaciones con el cuadrado de la longitud. |

## Modelos generativos y probabilísticos

| ID | Concepto | Inglés | Definición |
|---|---|---|---|
| C528 | Autoencoder | Autoencoder | Aprende un codificador y un decodificador para reconstruir entradas mediante una representación intermedia y restricciones elegidas. |
| C529 | Autoencoder con eliminación de ruido | Denoising autoencoder | Reconstruye una entrada limpia a partir de una versión corrompida bajo una política de corrupción. |
| C530 | Autoencoder disperso | Sparse autoencoder | Favorece que pocas unidades latentes estén activas por observación mediante una restricción o penalización. |
| C531 | Autoencoder variacional | Variational autoencoder | Modelo generativo latente que aprende una distribución aproximada de inferencia y un decodificador probabilístico. |
| C532 | Cota inferior de evidencia | Evidence lower bound | Objetivo variacional que acota por debajo la log-evidencia y combina ajuste de datos con una discrepancia de distribuciones. |
| C533 | Truco de reparametrización | Reparameterization trick | Expresa una muestra mediante ruido auxiliar y una transformación diferenciable para estimar determinados gradientes. |
| C534 | Colapso del posterior | Posterior collapse | El posterior aproximado deja de aprovechar información de la observación y se aproxima al prior en ciertos modelos latentes. |
| C535 | Red generativa antagónica | Generative adversarial network | Entrena un generador y un discriminador mediante objetivos enfrentados para aproximar una distribución de datos. |
| C536 | GAN de Wasserstein | Wasserstein GAN | Usa un crítico con restricciones de Lipschitz para construir un objetivo relacionado con transporte de masa. |
| C537 | Crítico generativo | Generative critic | Función de puntuación utilizada para comparar muestras o distribuciones; no siempre produce una probabilidad de clase. |
| C538 | Penalización de gradiente del crítico | Critic gradient penalty | Penaliza propiedades de la norma del gradiente del crítico en puntos muestreados según una política. |
| C539 | Colapso de modos | Mode collapse | Un generador produce variedad insuficiente y omite partes relevantes de la distribución objetivo. |
| C540 | GAN condicional | Conditional GAN | Condiciona generación y evaluación adversarial en información adicional, como etiquetas o contexto. |
| C541 | Flujo normalizante | Normalizing flow | Transforma una distribución base mediante funciones invertibles cuya densidad puede calcularse usando Jacobianas. |
| C542 | Cambio de variable en densidades | Change of variables for densities | Relaciona densidades antes y después de una transformación invertible mediante el determinante absoluto de su Jacobiana. |
| C543 | Modelo de difusión DDPM | Denoising diffusion probabilistic model | Aprende un proceso inverso de una corrupción progresiva por ruido mediante un objetivo probabilístico. |
| C544 | Ajuste de score | Score matching | Entrena una función para aproximar el gradiente del logaritmo de una densidad bajo un objetivo apropiado. |
| C545 | Ajuste de score con eliminación de ruido | Denoising score matching | Aprende scores de distribuciones perturbadas usando datos corrompidos y objetivos derivados del mecanismo de ruido. |
| C546 | Difusión latente | Latent diffusion | Realiza el proceso de difusión sobre representaciones comprimidas en lugar de operar directamente sobre todos los datos originales. |
| C547 | Guía sin clasificador | Classifier-free guidance | Combina predicciones condicionadas y no condicionadas de un generador para modular la fuerza del condicionamiento. |
| C548 | Generación autorregresiva | Autoregressive generation | Produce una secuencia factorizando cada elemento condicionado en los anteriores bajo un orden definido. |
| C549 | Modelado de lenguaje enmascarado | Masked language modeling | Aprende a predecir unidades ocultadas usando el contexto disponible, que puede incluir posiciones posteriores. |
| C550 | Modelado causal de lenguaje | Causal language modeling | Predice el siguiente token utilizando solo el prefijo permitido por la tarea. |
| C551 | Log-verosimilitud negativa | Negative log-likelihood | Objetivo que penaliza asignar baja probabilidad o densidad a observaciones; su forma depende del modelo probabilístico. |
| C552 | Perplejidad de lenguaje | Language-model perplexity | Exponencial de la log-verosimilitud negativa media por token bajo una base y tokenización determinadas; no mide directamente veracidad. |

## Aprendizaje de representaciones y supervisión limitada

| ID | Concepto | Inglés | Definición |
|---|---|---|---|
| C553 | Aprendizaje contrastivo | Contrastive learning | Aprende representaciones comparando relaciones de similitud entre observaciones o vistas según un objetivo. |
| C554 | Pérdida InfoNCE | InfoNCE loss | Objetivo contrastivo que distingue una pareja asociada frente a alternativas bajo una construcción de muestreo. |
| C555 | SimCLR | SimCLR | Método contrastivo que aprende a acercar representaciones de vistas aumentadas de una misma imagen. |
| C556 | MoCo | Momentum contrast | Aprende representaciones contrastivas utilizando un codificador actualizado por momento y una colección de representaciones comparables. |
| C557 | BYOL | Bootstrap your own latent | Aprende a predecir representaciones de una red objetivo actualizada por promedio móvil sin negativos explícitos en su objetivo. |
| C558 | SimSiam | SimSiam | Método de representaciones con ramas siamesas, predictor y detención de gradiente, sin negativos explícitos. |
| C559 | Barlow Twins | Barlow Twins | Busca invariancia y reducción de redundancia haciendo que una matriz de correlación cruzada se aproxime a la identidad. |
| C560 | VICReg | VICReg | Combina términos de invariancia, varianza y covarianza para aprender representaciones y combatir soluciones colapsadas. |
| C561 | DINO | DINO self-distillation | Método de autodestilación sin etiquetas que relaciona salidas de estudiante y docente sobre vistas de una observación. |
| C562 | Autoencoder enmascarado | Masked autoencoder | Aprende reconstruyendo partes ocultadas de una entrada a partir de su contenido visible. |
| C563 | Tarea pretexto | Pretext task | Objetivo auxiliar diseñado para aprender una representación útil sin depender necesariamente de etiquetas de la tarea final. |
| C564 | Pareja negativa | Negative pair | Par de observaciones tratado como no asociado en un objetivo contrastivo; esa decisión puede contener falsos negativos. |
| C565 | Pareja positiva | Positive pair | Par tratado como asociado para aprendizaje de similitud, por ejemplo dos vistas válidas de una misma observación. |
| C566 | Colapso de representaciones | Representation collapse | La representación pierde distinciones relevantes, por ejemplo asignando prácticamente el mismo vector a todas las entradas. |
| C567 | Pérdida triplete | Triplet loss | Compara un ancla con un ejemplo asociado y otro no asociado, exigiendo separación relativa según un margen. |
| C568 | Red siamesa | Siamese network | Arquitectura con ramas que comparten parámetros para comparar entradas mediante representaciones compatibles. |
| C569 | Aprendizaje de métricas | Metric learning | Aprende representaciones o funciones de distancia para que relaciones geométricas reflejen asociaciones de interés. |
| C570 | Clustering profundo | Deep clustering | Combina aprendizaje de representaciones con asignaciones de grupos que pueden actuar como señales de entrenamiento. |
| C571 | Supervisión débil | Weak supervision | Aprende con señales incompletas, imprecisas o generadas por reglas, que requieren considerar su incertidumbre. |
| C572 | Aprendizaje semisupervisado | Semi-supervised learning | Combina observaciones etiquetadas y no etiquetadas bajo supuestos que relacionan su distribución con el objetivo. |
| C573 | Pseudoetiquetado | Pseudo-labeling | Usa predicciones del modelo como etiquetas de datos no etiquetados; puede reforzar errores existentes. |
| C574 | Regularización por consistencia | Consistency regularization | Favorece predicciones o representaciones compatibles ante perturbaciones que deberían preservar la información pertinente. |
| C575 | Aprendizaje activo | Active learning | Selecciona qué observaciones solicitar para etiquetado con el objetivo de mejorar el aprendizaje bajo un presupuesto. |
| C576 | Consulta por comité | Query by committee | Selecciona ejemplos según desacuerdo entre modelos para priorizar nuevas etiquetas. |
| C577 | Muestreo por incertidumbre | Uncertainty sampling | Prioriza observaciones con predicciones inciertas según una medida explícita, que puede fallar si el modelo está mal calibrado. |

## Aprendizaje por refuerzo

| ID | Concepto | Inglés | Definición |
|---|---|---|---|
| C578 | Proceso de decisión de Markov | Markov decision process | Modelo de interacción definido por estados, acciones, transiciones y recompensas con una estructura markoviana. |
| C579 | Estado en refuerzo | Reinforcement-learning state | Representación de la situación usada para decidir; debe incluir la información pertinente para el supuesto markoviano adoptado. |
| C580 | Acción en refuerzo | Reinforcement-learning action | Decisión disponible para un agente que puede modificar transiciones, observaciones y recompensas posteriores. |
| C581 | Política de un agente | Policy | Regla determinista o distribución condicionada que selecciona acciones a partir de la información disponible. |
| C582 | Recompensa | Reward | Señal numérica emitida por una interacción; no equivale necesariamente al objetivo humano completo. |
| C583 | Retorno acumulado | Return | Suma, a menudo descontada, de recompensas futuras según la convención temporal de la tarea. |
| C584 | Factor de descuento | Discount factor | Pondera recompensas futuras y afecta al horizonte efectivo del objetivo. |
| C585 | Función de valor de estado | State-value function | Esperanza del retorno al comenzar en un estado y seguir una política especificada. |
| C586 | Función de valor de acción | Action-value function | Esperanza del retorno al elegir una acción en un estado y continuar según una política. |
| C587 | Ecuación de Bellman | Bellman equation | Expresa valor como recompensa inmediata esperada más valor futuro, bajo una política u operador de optimalidad. |
| C588 | Iteración de valores | Value iteration | Actualiza valores mediante un operador de optimalidad de Bellman para aproximar una solución bajo sus condiciones. |
| C589 | Iteración de políticas | Policy iteration | Alterna evaluar una política y mejorarla respecto a los valores estimados. |
| C590 | Control Monte Carlo | Monte Carlo control | Estima retornos a partir de episodios o trayectorias para mejorar una política sin necesitar un modelo completo de transiciones. |
| C591 | Aprendizaje por diferencias temporales | Temporal-difference learning | Actualiza estimaciones usando recompensas observadas y una estimación posterior como objetivo parcial. |
| C592 | Q-learning | Q-learning | Actualiza valores de acción mediante una regla de optimalidad que utiliza la mejor acción estimada para el siguiente estado. |
| C593 | SARSA | SARSA | Actualiza un valor de acción usando la siguiente acción realmente elegida por la política que genera la trayectoria. |
| C594 | Red Q profunda | Deep Q-network | Aproxima valores de acción mediante una red, habitualmente combinada con red objetivo y reproducción de experiencias. |
| C595 | Double DQN | Double DQN | Separa selección y evaluación de la acción del objetivo para reducir determinados efectos de sobreestimación. |
| C596 | Reproducción de experiencias | Experience replay | Reutiliza transiciones almacenadas para formar lotes, modificando dependencia temporal y eficiencia de uso de datos. |
| C597 | Reproducción priorizada | Prioritized experience replay | Muestrea experiencias con prioridades y puede usar correcciones de importancia para compensar el cambio de distribución. |
| C598 | Gradiente de política | Policy gradient | Optimiza parámetros de una política usando estimaciones del gradiente del retorno esperado. |
| C599 | REINFORCE | REINFORCE | Estimador Monte Carlo del gradiente de política basado en log-probabilidades de acciones y retornos. |
| C600 | Actor-crítico | Actor-critic | Combina una política parametrizada con una función de valor que ayuda a estimar su señal de mejora. |
| C601 | Optimización proximal de políticas | Proximal policy optimization | Familia de objetivos que limita o penaliza cambios de política; el recorte no impone una región de confianza estricta. |
| C602 | Dilema exploración-explotación | Exploration-exploitation trade-off | Equilibra obtener información mediante acciones inciertas y aprovechar las acciones que actualmente parecen mejores. |

## Evaluación avanzada y causalidad

| ID | Concepto | Inglés | Definición |
|---|---|---|---|
| C603 | Coeficiente de Matthews | Matthews correlation coefficient | Resume asociación entre etiquetas y predicciones, considerando las cuatro celdas binarias y una convención para denominadores nulos. |
| C604 | Exactitud equilibrada | Balanced accuracy | Promedia sensibilidades por clase para evitar que una clase mayoritaria determine por sí sola la exactitud. |
| C605 | Kappa de Cohen | Cohen kappa | Compara acuerdo observado con el esperado bajo un modelo basado en las distribuciones marginales. |
| C606 | Exactitud de subconjunto multietiqueta | Multilabel subset accuracy | Exige que el conjunto completo de etiquetas predichas coincida con el real para contar un acierto; puede ser estricta con muchas etiquetas. |
| C607 | Pérdida de Hamming | Hamming loss | Proporción de componentes de etiqueta incorrectos en una representación multietiqueta definida. |
| C608 | Exactitud top-k | Top-k accuracy | Cuenta acierto cuando la clase real aparece entre las k puntuaciones más altas, con una regla de empates. |
| C609 | Ganancia acumulada descontada normalizada | Normalized discounted cumulative gain | Evalúa un ranking comparando su ganancia descontada con la de una ordenación ideal. |
| C610 | Ganancia acumulada descontada | Discounted cumulative gain | Acumula relevancia de resultados reduciendo la contribución de posiciones tardías según una función de descuento. |
| C611 | Rango recíproco medio | Mean reciprocal rank | Promedia el inverso de la posición del primer resultado relevante de cada consulta. |
| C612 | Sensibilidad en los primeros k | Recall at k | Fracción de elementos relevantes recuperados dentro de los primeros k resultados. |
| C613 | Precisión en los primeros k | Precision at k | Fracción de resultados relevantes entre las primeras k posiciones consideradas. |
| C614 | Cobertura del catálogo en k | Catalog coverage at k | Proporción del catálogo que aparece en las recomendaciones top-k agregadas sobre una población o conjunto de consultas. |
| C615 | Predicción conforme | Conformal prediction | Construye conjuntos o intervalos predictivos con garantías de cobertura marginal bajo condiciones como intercambiabilidad. |
| C616 | Intercambiabilidad | Exchangeability | La distribución conjunta permanece igual al permutar el orden de observaciones; no implica independencia. |
| C617 | Intervalo de predicción | Prediction interval | Rango destinado a cubrir una observación futura según un procedimiento, distinto de un intervalo para un parámetro. |
| C618 | Cobertura predictiva | Prediction coverage | Proporción o probabilidad de objetivos contenidos en sus conjuntos predictivos; debe indicarse si es marginal o condicionada. |
| C619 | Error esperado de calibración | Expected calibration error | Agrega discrepancias entre confianza y frecuencia observada por grupos; depende de cómo se construyen esos grupos. |
| C620 | Error máximo de calibración | Maximum calibration error | Mayor discrepancia observada entre confianza y frecuencia dentro de los grupos de calibración considerados. |
| C621 | Conformal Mondrian | Mondrian conformal prediction | Aplica una partición de categorías o contextos al procedimiento conforme para obtener garantías por grupos bajo sus condiciones. |
| C622 | Grafo causal dirigido acíclico | Causal directed acyclic graph | Representa supuestas relaciones causales mediante flechas sin ciclos; los datos por sí solos no justifican cualquier orientación. |
| C623 | Criterio de puerta trasera | Backdoor criterion | Condición gráfica para identificar un efecto causal mediante ajuste cuando se satisfacen los supuestos del grafo. |
| C624 | Criterio de puerta delantera | Frontdoor criterion | Condición de identificación causal que utiliza mediadores y restricciones gráficas específicas. |
| C625 | Variable instrumental | Instrumental variable | Variable usada para identificar efectos bajo restricciones de relación, exclusión e independencia que requieren justificación. |
| C626 | Efecto medio del tratamiento | Average treatment effect | Diferencia esperada entre resultados potenciales bajo tratamiento y control para una población definida. |
| C627 | Razonamiento contrafactual | Counterfactual reasoning | Pregunta qué habría ocurrido bajo una intervención distinta para una unidad o situación, según un modelo causal. |

## MLOps, privacidad y responsabilidad

| ID | Concepto | Inglés | Definición |
|---|---|---|---|
| C628 | MLOps | Machine learning operations | Prácticas para versionar, validar, desplegar y supervisar sistemas de aprendizaje automático a lo largo de su ciclo de vida. |
| C629 | Almacén de características | Feature store | Sistema que gestiona definiciones y disponibilidad de características para usos de entrenamiento e inferencia. |
| C630 | Registro de modelos | Model registry | Catálogo de artefactos y metadatos que permite controlar versiones, estados y referencias de modelos. |
| C631 | Ficha de modelo | Model card | Documento que describe uso previsto, evaluaciones, límites y otros aspectos de un modelo. |
| C632 | Ficha de dataset | Dataset datasheet | Documentación sobre creación, composición, usos, restricciones y mantenimiento de un conjunto de datos. |
| C633 | Versionado de modelos | Model versioning | Identifica cambios de artefactos y configuración para relacionar una predicción con la versión que la produjo. |
| C634 | Linaje de datos | Data lineage | Registra procedencia y transformaciones de datos para comprender dependencias, auditoría e impacto de cambios. |
| C635 | Contrato de datos | Data contract | Acuerdo verificable sobre esquema, significado y condiciones de calidad o disponibilidad de una fuente. |
| C636 | Contenerización | Containerization | Empaqueta software y dependencias de ejecución para facilitar entornos reproducibles, sin garantizar identidad completa del hardware. |
| C637 | Despliegue canario | Canary deployment | Expone una versión nueva a una parte controlada del tráfico antes de ampliar su uso. |
| C638 | Ejecución en sombra | Shadow deployment | Ejecuta un modelo candidato con tráfico real sin utilizar su respuesta para decidir en el flujo principal. |
| C639 | Experimento A/B | A/B experiment | Compara alternativas mediante asignación controlada, idealmente aleatoria, y métricas y unidad experimental previamente definidas. |
| C640 | Monitorización del rendimiento | Model performance monitoring | Observa resultados y métricas en operación considerando retrasos de etiquetas, segmentos y cambios de contexto. |
| C641 | Índice de estabilidad poblacional | Population stability index | Compara frecuencias por intervalos entre poblaciones; depende de discretización y tratamiento de ceros, sin umbrales universales. |
| C642 | Privacidad diferencial | Differential privacy | Limita cuánto puede cambiar una distribución de respuestas al modificar los datos de una persona bajo una relación de vecindad. |
| C643 | Presupuesto de privacidad | Privacy budget | Parámetros y contabilidad que describen garantías de mecanismos privados y su composición; épsilon no es un porcentaje de anonimato. |
| C644 | Aprendizaje federado | Federated learning | Coordina entrenamiento entre participantes sin centralizar necesariamente sus datos brutos; no garantiza privacidad por sí solo. |
| C645 | Agregación segura | Secure aggregation | Protocolo que permite obtener agregados de contribuciones sin revelar individualmente cada contribución al agregador bajo sus supuestos. |
| C646 | Ataque de pertenencia | Membership inference attack | Intenta determinar si una observación formó parte de los datos usados para ajustar un modelo. |
| C647 | Inversión de modelos | Model inversion | Busca reconstruir o inferir información sensible a partir de acceso a un modelo y sus respuestas. |
| C648 | Envenenamiento de datos | Data poisoning | Manipula datos de entrenamiento para degradar o dirigir el comportamiento del sistema aprendido. |
| C649 | Ataque de puerta trasera | Backdoor attack | Introduce un comportamiento activado por un patrón o condición mientras el modelo puede mantener funcionamiento aparente en otros casos. |
| C650 | Ejemplo adversarial | Adversarial example | Entrada modificada para inducir un comportamiento no deseado del modelo dentro de restricciones definidas. |
| C651 | Igualdad de odds | Equalized odds | Criterio de equidad que exige iguales tasas de verdaderos y falsos positivos entre grupos, condicionando en la etiqueta real. |
| C652 | Paridad demográfica | Demographic parity | Exige igual tasa de decisiones positivas entre grupos; puede entrar en tensión con otros criterios y objetivos contextuales. |
