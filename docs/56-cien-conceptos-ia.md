# Cien conceptos adicionales de IA · C1001–C1100

Entrega 1.3.0, 28/10/2026, posterior a [importancia por permutación](55-importancia-permutacion-x1.md). El catálogo pasa de 652 a **752 fichas**: 152 con actividad implementada y **600 referencias de consulta**. El paquete anterior C153–C652 se conserva íntegro; se añaden diez temas, para treinta temas de referencia.

La fuente es [extension-ai-100.json](../src/content/catalog/extension-ai-100.json). Título español, inglés, definición original y alias explícitos. Estas fichas no se presentan como simulaciones implementadas. Están disponibles en búsqueda, filtros, paginación y enlaces estables, por ejemplo [C1001](https://franmatias.github.io/neural-atlas/#/glosario?q=C1001).

## Identidad y revisión de duplicados

Se usa un bloque nuevo C1001–C1100 para evitar el rango habitual de ejemplos locales C653 en adelante. No se renumera ningún registro anterior ni se exige continuidad numérica global. C653 sigue siendo el primer ID libre en una instalación limpia; los IDs ocupados se consultan en el catálogo antes de crear un paquete.

Se comprueban títulos españoles, ingleses y alias contra las 652 fichas anteriores, normalizando acentos, espacios y puntuación. La revisión semántica distingue: colapso neuronal de colapso de representaciones; caché de prefijos compartidos de caché KV de una secuencia; estado de creencia de estado observado; muestreo por rechazo de selección best-of-N; invocación de herramientas de una acción abstracta de refuerzo; y cálculo de intervenciones de criterios concretos de identificación causal. No son cien variantes de nombres ya existentes.

Un concepto personalizado previamente guardado conserva su identidad si una referencia incluida nueva ocupa su ID: el registro local con historial confirmado prevalece y la referencia queda oculta mientras ese paquete esté activo. Retirar el paquete vuelve a mostrar la referencia incluida. Esta recuperación no permite que una importación nueva sustituya otra identidad: se mantienen las comprobaciones de propietario y slug. Nunca se descarta toda la biblioteca por esa colisión. C653 y los paquetes de ejemplo anteriores permanecen intactos.

El script genera este documento y verifica el paquete de cien. Las pruebas de catálogo comprueban además los conceptos fundamentales, todas las traducciones, búsquedas exactas, alias y la recuperación de identidades locales. No hay máximo global fijo.

## Fuentes primarias para ampliar

Definiciones redactadas para este catálogo, sin copiar explicaciones ni afirmar que estas técnicas estén implementadas. Las fuentes permiten profundizar y contrastar los supuestos de cada familia:

- [Poole y Mackworth, Artificial Intelligence 3e](https://artint.info/3e/html/ArtInt3e.html): representación, razonamiento, planificación y agentes.
- [CMU, unificación y programación lógica](https://www.cs.cmu.edu/~fp/courses/lp/lectures/lp-all.pdf).
- [Brady Neal, curso de inferencia causal](https://www.bradyneal.com/causal-inference-course).
- [Neural Tangent Kernel](https://arxiv.org/abs/1806.07572), [Neural Collapse](https://arxiv.org/abs/2008.08186), [Grokking](https://arxiv.org/abs/2201.02177), [Edge of Stability](https://arxiv.org/abs/2103.00065) y [Gradient Noise Scale](https://arxiv.org/abs/1812.06162).
- [PagedAttention](https://arxiv.org/abs/2309.06180) y [TensorRT-LLM: decodificación especulativa](https://nvidia.github.io/TensorRT-LLM/1.4.0rc1/features/speculative-decoding.html).
- [DPO](https://arxiv.org/abs/2305.18290) y [Understanding Learning from Human Preferences](https://deepmind.google/research/publications/54918/).

- [RAG](https://arxiv.org/abs/2005.11401) y [ColBERT](https://arxiv.org/abs/2004.12832): recuperación, generación e interacción tardía.
- [FlashAttention](https://arxiv.org/abs/2205.14135), [AI safety via debate](https://arxiv.org/abs/1805.00899) y [ARC: Eliciting Latent Knowledge](https://www.alignment.org/blog/arcs-first-technical-report-eliciting-latent-knowledge/).

[Captura de escritorio](implementation/catalog-ai-100.png) · [Captura móvil](implementation/catalog-ai-100-mobile.png). Búsquedas bilingües y por siglas, treinta temas, paginación y enlaces de cuatro cifras se comprueban con Playwright. La revisión lexical normalizada se ejecuta de nuevo en cada CI.

## Catálogo

## Lógica simbólica y conocimiento

| ID | Español | Inglés | Definición |
|---|---|---|---|
| C1001 | Unificación | Unification | Encuentra una sustitución de variables que hace coincidir expresiones simbólicas. Es una operación central en demostración automática y programación lógica; no equivale a medir similitud entre embeddings. |
| C1002 | Resolución lógica | Resolution | Regla de inferencia que combina cláusulas con literales complementarios para obtener una consecuencia. En demostración por refutación se busca derivar la cláusula vacía. |
| C1003 | Encadenamiento hacia delante | Forward chaining | Aplica reglas a hechos conocidos para producir nuevos hechos hasta alcanzar un objetivo o un punto fijo. El orden de ejecución y la terminación dependen del lenguaje de reglas. |
| C1004 | Encadenamiento hacia atrás | Backward chaining | Parte de una consulta y busca reglas capaces de demostrarla, convirtiendo sus premisas en subobjetivos. Requiere controlar alternativas y ciclos durante la búsqueda. |
| C1005 | Cláusula de Horn | Horn clause | Cláusula lógica con como máximo un literal positivo. Las cláusulas definidas permiten representar reglas útiles para inferencia eficiente y programación lógica. |
| C1006 | Universo de Herbrand | Herbrand universe | Conjunto de términos cerrados construidos con las constantes y funciones de un lenguaje lógico. Proporciona un dominio sintáctico para estudiar satisfacibilidad y modelos. |
| C1007 | Lógica descriptiva | Description logic | Familia de formalismos para representar conceptos, relaciones e individuos con semántica precisa. Permite razonar sobre subsunción y consistencia de ontologías bajo restricciones de expresividad. |
| C1008 | Alineamiento de ontologías | Ontology alignment | Identifica correspondencias entre entidades de ontologías distintas para facilitar interoperabilidad. Una coincidencia léxica no demuestra que dos conceptos tengan el mismo significado. |
| C1009 | Supuesto de mundo cerrado | Closed-world assumption | Trata como falsas las afirmaciones que no pueden derivarse del conocimiento disponible. Es una decisión semántica útil en ciertos sistemas, no una garantía de completitud de sus datos. |
| C1010 | Supuesto de mundo abierto | Open-world assumption | La ausencia de una afirmación no permite concluir que sea falsa. Facilita representar conocimiento incompleto, distinguiendo lo desconocido de lo refutado. |

## Planificación automática

| ID | Español | Inglés | Definición |
|---|---|---|---|
| C1011 | Representación STRIPS | STRIPS | Describe acciones mediante precondiciones y efectos de adición o eliminación sobre hechos. Es una base de planificación clásica con supuestos restrictivos sobre estados y acciones. |
| C1012 | Lenguaje PDDL | Planning Domain Definition Language | Lenguaje para especificar dominios y problemas de planificación mediante acciones, condiciones y objetivos. Sus extensiones incorporan expresividad adicional y no todos los planificadores admiten las mismas variantes. |
| C1013 | Planificación de orden parcial | Partial-order planning | Construye planes imponiendo únicamente las precedencias necesarias entre acciones. Mantiene compromisos de orden abiertos mientras resuelve condiciones y conflictos del plan. |
| C1014 | Red jerárquica de tareas | Hierarchical task network | Representa tareas compuestas que se descomponen mediante métodos hasta obtener acciones ejecutables. El conocimiento de descomposición guía la búsqueda y limita los planes considerados. |
| C1015 | Grafo de planificación relajado | Relaxed planning graph | Organiza hechos y acciones alcanzables por niveles en una versión simplificada del problema. Su estructura puede apoyar heurísticas sin resolver exactamente el problema original. |
| C1016 | Relajación de efectos de borrado | Delete relaxation | Simplifica un problema de planificación ignorando efectos que eliminan hechos. Facilita estimaciones heurísticas, pero puede producir soluciones que no son ejecutables en el dominio completo. |
| C1017 | Hito de planificación | Planning landmark | Hecho o acción que debe alcanzarse en todo plan válido bajo la definición considerada. Los hitos ayudan a estimar progreso y orientar la búsqueda. |
| C1018 | Reparación de planes | Plan repair | Modifica un plan existente cuando cambian el estado, las restricciones o las acciones disponibles. Busca recuperar viabilidad aprovechando estructura previa, sin garantizar cambios mínimos. |
| C1019 | Planificación contingente | Contingent planning | Construye planes con ramas dependientes de observaciones durante la ejecución. Permite actuar bajo información incompleta cuando futuras observaciones pueden resolver incertidumbre relevante. |
| C1020 | Planificación temporal | Temporal planning | Considera duración, solapamiento y restricciones temporales de acciones. La validez requiere satisfacer tanto condiciones lógicas como relaciones temporales entre eventos. |

## Razonamiento y satisfacibilidad

| ID | Español | Inglés | Definición |
|---|---|---|---|
| C1021 | Razonamiento abductivo | Abductive reasoning | Busca hipótesis que explicarían observaciones dadas junto con conocimiento de fondo. Una explicación compatible no queda demostrada y puede competir con otras hipótesis. |
| C1022 | Razonamiento no monótono | Nonmonotonic reasoning | Permite retirar conclusiones al incorporar información nueva. Resulta útil para conocimiento revisable y excepciones, a diferencia de la acumulación monótona de consecuencias clásicas. |
| C1023 | Lógica por defecto | Default logic | Formaliza inferencias plausibles que se aceptan mientras ciertas condiciones sean compatibles con el conocimiento. Puede admitir distintas extensiones y exige especificar cómo se tratan los conflictos. |
| C1024 | Circunscripción lógica | Circumscription | Expresa supuestos de minimalidad sobre la extensión de predicados para formalizar razonamiento por defecto. La elección de qué minimizar afecta a las conclusiones obtenidas. |
| C1025 | Programación de conjuntos de respuesta | Answer set programming | Paradigma declarativo que codifica problemas mediante reglas y busca modelos estables. Es útil para problemas combinatorios, con semántica distinta de ejecutar reglas en cualquier orden. |
| C1026 | Sistema de mantenimiento de verdad | Truth maintenance system | Registra dependencias y justificaciones de creencias para revisarlas cuando cambian sus apoyos. No garantiza que los hechos iniciales describan correctamente el mundo. |
| C1027 | Algoritmo DPLL | Davis–Putnam–Logemann–Loveland algorithm | Procedimiento de búsqueda para satisfacibilidad proposicional que combina decisiones, propagación y retroceso. Explora asignaciones sin enumerarlas necesariamente todas de forma explícita. |
| C1028 | Aprendizaje de cláusulas por conflicto | Conflict-driven clause learning | Mejora la búsqueda SAT analizando conflictos para aprender cláusulas y evitar repetir regiones incompatibles. Suele combinarse con retroceso no cronológico y propagación eficiente. |
| C1029 | Satisfacibilidad módulo teorías | Satisfiability modulo theories | Comprueba fórmulas lógicas interpretadas sobre teorías como aritmética o estructuras de datos. Integra razonamiento proposicional con procedimientos específicos de esas teorías. |
| C1030 | Máxima satisfacibilidad | Maximum satisfiability | Busca satisfacer el mayor número o peso de cláusulas, posiblemente junto a restricciones obligatorias. Convierte una cuestión de existencia de modelo en un problema de optimización. |

## Identificación y estimación causal

| ID | Español | Inglés | Definición |
|---|---|---|---|
| C1031 | Cálculo de intervenciones | Do-calculus | Conjunto de reglas para transformar expresiones probabilísticas que incluyen intervenciones bajo un modelo causal. Permite estudiar identificación, pero depende de supuestos estructurales adecuados. |
| C1032 | Modelo causal estructural | Structural causal model | Representa variables mediante ecuaciones y factores exógenos para describir mecanismos causales. Permite definir intervenciones y contrafactuales sin confundirlos con condicionamiento observacional. |
| C1033 | Resultados potenciales | Potential outcomes | Describe el resultado que una unidad tendría bajo cada tratamiento posible. La imposibilidad de observar simultáneamente alternativas motiva supuestos y diseños para estimar efectos causales. |
| C1034 | Puntuación de propensión | Propensity score | Probabilidad de recibir un tratamiento condicionada a covariables observadas. Puede apoyar ajustes causales bajo supuestos de ausencia de confusión no medida y positividad. |
| C1035 | Ponderación por probabilidad inversa | Inverse probability weighting | Repondera observaciones según probabilidades estimadas de tratamiento o selección para construir una población objetivo. Pesos extremos pueden aumentar varianza y revelar problemas de soporte. |
| C1036 | Estimación doblemente robusta | Doubly robust estimation | Combina modelos de resultado y tratamiento para conservar consistencia si uno de ellos está correctamente especificado, bajo los demás supuestos. No protege frente a cualquier sesgo. |
| C1037 | Discontinuidad en regresión | Regression discontinuity | Aprovecha un umbral de asignación para estimar efectos locales comparando unidades cercanas al corte. La interpretación causal requiere condiciones de continuidad y ausencia de manipulación relevante. |
| C1038 | Diferencias en diferencias | Difference-in-differences | Compara cambios temporales entre grupos tratados y de comparación. La identificación depende de supuestos como tendencias paralelas, que no se justifican solo por una regresión ajustada. |
| C1039 | Control sintético | Synthetic control | Construye una combinación de unidades de comparación para aproximar la trayectoria previa de una unidad tratada. El ajuste previo y la disponibilidad de donantes limitan la inferencia. |
| C1040 | Descubrimiento causal | Causal discovery | Intenta inferir estructuras causales a partir de datos y supuestos explícitos. Dependencias estadísticas pueden ser compatibles con múltiples grafos, sin identificar una dirección causal única. |

## Robótica y decisiones parcialmente observables

| ID | Español | Inglés | Definición |
|---|---|---|---|
| C1041 | Estado de creencia | Belief state | Representa una distribución sobre estados posibles cuando el estado real no se observa directamente. Se actualiza con acciones y observaciones dentro de un modelo de incertidumbre. |
| C1042 | Proceso parcialmente observable de decisión | Partially observable Markov decision process | Extiende el modelo de decisión de Markov con observaciones incompletas del estado. Las políticas pueden actuar sobre creencias o historial en lugar de conocer el estado real. |
| C1043 | Propagación de creencias | Belief propagation | Intercambia mensajes en un grafo probabilístico para calcular marginales o inferencias relacionadas. Es exacta en ciertas estructuras sin ciclos; con ciclos no siempre converge ni es exacta. |
| C1044 | Filtro de partículas | Particle filter | Aproxima una distribución de estados mediante muestras ponderadas que se propagan y actualizan con observaciones. El remuestreo controla degeneración, pero puede perder diversidad. |
| C1045 | Filtro de Kalman extendido | Extended Kalman filter | Aproxima modelos no lineales mediante linealizaciones locales para estimar estado y covarianza. Su precisión depende de la no linealidad y de la calidad de esas aproximaciones. |
| C1046 | Filtro de Kalman unscented | Unscented Kalman filter | Propaga puntos sigma deterministas para aproximar cómo una transformación no lineal afecta a media y covarianza. No representa de forma exacta cualquier distribución posterior. |
| C1047 | Localización y mapeado simultáneos | Simultaneous localization and mapping | Estima conjuntamente la trayectoria de un agente y un mapa del entorno a partir de observaciones. La asociación de datos, la incertidumbre y los cierres de bucle son dificultades importantes. |
| C1048 | Mapa de ocupación | Occupancy grid | Divide el espacio en celdas que representan información sobre ocupación. La resolución y el modelo de observación condicionan el detalle y la incertidumbre del mapa. |
| C1049 | Clonación de comportamiento | Behavior cloning | Aprende una política mediante supervisión de pares observación–acción obtenidos de demostraciones. Los errores pueden acumularse cuando la política visita situaciones distintas de las demostradas. |
| C1050 | Aprendizaje por refuerzo inverso | Inverse reinforcement learning | Intenta inferir una función de recompensa compatible con el comportamiento observado de un experto. Distintas recompensas pueden explicar la misma política, por lo que se requieren restricciones adicionales. |

## Dinámica y teoría de redes profundas

| ID | Español | Inglés | Definición |
|---|---|---|---|
| C1051 | Kernel tangente neuronal | Neural tangent kernel | Kernel construido a partir de gradientes de las salidas respecto a parámetros. Bajo ciertos límites de anchura permite aproximar la dinámica de entrenamiento mediante métodos de kernels. |
| C1052 | Programa tensorial | Tensor program | Formalismo para describir cálculos con vectores y matrices aleatorias y estudiar límites de redes anchas. Sus resultados requieren hipótesis concretas sobre arquitectura y escalado. |
| C1053 | Límite de campo medio | Mean-field limit | Describe colectivos grandes mediante una evolución agregada, por ejemplo una distribución de parámetros. En redes neuronales el límite depende del escalado y no coincide siempre con el régimen de kernel. |
| C1054 | Colapso neuronal | Neural collapse | Patrón geométrico observado al final del entrenamiento de ciertos clasificadores: las representaciones intraclase se concentran y las medias de clase adquieren estructura regular. No es el colapso general de representaciones. |
| C1055 | Generalización tardía | Grokking | Fenómeno en el que la generalización mejora mucho después de alcanzar buen ajuste de entrenamiento. Se ha estudiado en tareas algorítmicas y no es una propiedad garantizada de toda red. |
| C1056 | Conectividad entre modos | Mode connectivity | Estudia caminos entre soluciones entrenadas a lo largo de los cuales la pérdida permanece baja. Depende del espacio de parámetros, el camino permitido y la función evaluada. |
| C1057 | Barrera de pérdida | Loss barrier | Incremento de pérdida encontrado a lo largo de un camino entre soluciones, respecto a una referencia declarada. Una barrera en interpolación lineal no descarta otro camino de baja pérdida. |
| C1058 | Borde de estabilidad | Edge of stability | Régimen estudiado de descenso del gradiente en el que la curvatura dominante se sitúa cerca del límite de estabilidad del paso. La pérdida puede oscilar a corto plazo y mejorar a largo plazo. |
| C1059 | Escala de ruido del gradiente | Gradient noise scale | Relaciona la variabilidad estocástica del gradiente con la magnitud de su señal media bajo una definición concreta. Ayuda a analizar el rendimiento de aumentar el lote. |
| C1060 | Tamaño crítico de lote | Critical batch size | Escala a partir de la cual aumentar el lote ofrece rendimientos decrecientes de paralelización bajo un modelo de eficiencia. Depende de la tarea, el entrenamiento y el criterio utilizado. |

## Inferencia eficiente de modelos de lenguaje

| ID | Español | Inglés | Definición |
|---|---|---|---|
| C1061 | Decodificación especulativa | Speculative decoding | Usa propuestas de tokens de un mecanismo rápido y las verifica con el modelo objetivo. Determinados protocolos preservan su distribución; una aceptación heurística cualquiera no ofrece esa garantía. |
| C1062 | Agrupación continua de solicitudes | Continuous batching | Actualiza dinámicamente el lote de inferencia incorporando solicitudes nuevas cuando otras terminan. Mejora aprovechamiento del servicio, pero requiere controlar memoria, prioridades y latencia. |
| C1063 | Caché de prefijos compartidos | Prefix caching | Reutiliza estados de inferencia ya calculados para prefijos compatibles entre solicitudes. Se distingue de conservar la caché de una sola conversación y depende de criterios correctos de reutilización. |
| C1064 | Atención paginada | PagedAttention | Organiza la caché de claves y valores en bloques gestionables para reducir desperdicio y facilitar su uso durante inferencia. Es una técnica de gestión de memoria, no una nueva semántica de atención. |
| C1065 | FlashAttention | FlashAttention | Familia de algoritmos que organiza el cálculo de atención para reducir transferencias de memoria y uso de almacenamiento intermedio. Conserva la operación matemática bajo sus convenciones numéricas. |
| C1066 | Procesamiento inicial por fragmentos | Chunked prefill | Divide el procesamiento de un contexto de entrada en fragmentos para organizar mejor el servicio de inferencia. Su planificación afecta al equilibrio entre rendimiento y latencia de otras solicitudes. |
| C1067 | Atención de ventana deslizante | Sliding-window attention | Restringe cada posición a una región local de contexto, según el patrón de la arquitectura. Reduce conexiones de atención, aunque la propagación entre capas puede ampliar el alcance efectivo. |
| C1068 | Sumidero de atención | Attention sink | Posición que recibe atención apreciable incluso cuando su contenido no es la información relevante para la tarea. Se estudia su papel al gestionar contextos y generación prolongada. |
| C1069 | Predicción de múltiples tokens | Multi-token prediction | Objetivo o mecanismo que predice varios tokens futuros por posición o paso. No implica que esos tokens puedan aceptarse sin verificación en cualquier esquema de generación. |
| C1070 | Muestreo por rechazo | Rejection sampling | Genera candidatos con una distribución propuesta y acepta algunos mediante una regla que busca una distribución objetivo. La corrección exige condiciones y cotas apropiadas para esa regla. |

## Recuperación y herramientas de IA

| ID | Español | Inglés | Definición |
|---|---|---|---|
| C1071 | Generación aumentada por recuperación | Retrieval-augmented generation | Combina recuperación de información con un modelo generativo para condicionar respuestas en material externo. La recuperación no garantiza exactitud, actualidad ni fidelidad a las fuentes. |
| C1072 | Invocación de herramientas | Tool calling | Permite que un sistema produzca solicitudes estructuradas a funciones o servicios externos y utilice sus resultados. Proponer una llamada no garantiza que sea válida ni autoriza cualquier efecto. |
| C1073 | Inyección de instrucciones | Prompt injection | Intento de introducir instrucciones adversarias para desviar un sistema que procesa lenguaje. Su impacto depende de cómo se separan las instrucciones confiables, los datos y las capacidades disponibles. |
| C1074 | Inyección indirecta de instrucciones | Indirect prompt injection | Introduce instrucciones adversarias en documentos, páginas u otras fuentes que el sistema consulta. El contenido recuperado no adquiere autoridad por aparecer dentro del contexto del modelo. |
| C1075 | Envenenamiento de la recuperación | Retrieval poisoning | Altera un corpus o su indexación para influir en los documentos recuperados y en respuestas posteriores. Puede afectar relevancia, integridad o seguridad sin modificar los pesos del generador. |
| C1076 | Recuperación híbrida | Hybrid retrieval | Combina señales de recuperación léxica y semántica dentro de un procedimiento declarado. La forma de fusionar resultados y sus escalas influye en relevancia y coste. |
| C1077 | Fusión recíproca de rangos | Reciprocal rank fusion | Combina listas ordenadas sumando aportaciones que decrecen con la posición de cada documento. Evita exigir que las puntuaciones originales sean directamente comparables. |
| C1078 | Relevancia marginal máxima | Maximal marginal relevance | Selecciona resultados equilibrando relevancia respecto a la consulta y redundancia con elementos ya elegidos. El equilibrio depende de una medida de similitud y un parámetro de compromiso. |
| C1079 | Reescritura de consultas | Query rewriting | Transforma una consulta para facilitar la recuperación o aclarar su contexto. Una reformulación puede mejorar cobertura o introducir cambios de intención que deben evaluarse. |
| C1080 | Recuperación con interacción tardía | Late-interaction retrieval | Representa consultas y documentos con múltiples vectores y los compara en una fase de interacción posterior. Ofrece un equilibrio distinto entre expresividad, almacenamiento y coste que un único vector. |

## Verificación y sistemas neurosimbólicos

| ID | Español | Inglés | Definición |
|---|---|---|---|
| C1081 | Refinamiento guiado por contraejemplos | Counterexample-guided abstraction refinement | Refina una abstracción cuando un contraejemplo aparente resulta espurio en el sistema concreto. Alterna análisis y refinamiento sin garantizar por sí solo terminación en cualquier dominio. |
| C1082 | Verificación acotada de modelos | Bounded model checking | Busca violaciones de una propiedad en ejecuciones de longitud limitada mediante una codificación lógica. No encontrar fallos dentro de la cota no prueba automáticamente corrección ilimitada. |
| C1083 | Interpretación abstracta | Abstract interpretation | Analiza propiedades de programas mediante dominios abstractos y transformaciones que aproximan su semántica. Una aproximación conservadora puede garantizar solidez y producir falsos positivos. |
| C1084 | Lógica temporal | Temporal logic | Formaliza propiedades sobre evolución y secuencias de estados, como que una condición ocurra eventualmente o se mantenga siempre. Existen lenguajes con distintas interpretaciones del tiempo y las trayectorias. |
| C1085 | Bisimulación | Bisimulation | Relación que compara sistemas mediante la correspondencia de sus transiciones y observaciones. Puede justificar equivalencia de comportamiento bajo una semántica específica. |
| C1086 | Escudo de seguridad para políticas | Policy shielding | Restringe o sustituye acciones propuestas por una política usando condiciones de seguridad declaradas. Las garantías dependen de la especificación, el modelo y la intervención permitida. |
| C1087 | Aseguramiento en ejecución | Runtime assurance | Supervisa un sistema durante su funcionamiento y activa mecanismos de respaldo ante condiciones definidas. La cobertura y los supuestos del monitor delimitan la protección que ofrece. |
| C1088 | Integración neurosimbólica | Neuro-symbolic integration | Combina componentes de aprendizaje neuronal y representación o razonamiento simbólico. La integración puede adoptar formas distintas y no garantiza interpretabilidad o corrección por sí misma. |
| C1089 | Síntesis de programas | Program synthesis | Busca programas que satisfagan ejemplos, restricciones o especificaciones formales. La validez observada depende de la cobertura de ejemplos o de las garantías del procedimiento de verificación. |
| C1090 | Programación lógica inductiva | Inductive logic programming | Aprende hipótesis expresadas mediante reglas lógicas a partir de ejemplos y conocimiento de fondo. La elección del lenguaje de hipótesis condiciona expresividad, búsqueda y generalización. |

## Preferencias, supervisión y alineamiento

| ID | Español | Inglés | Definición |
|---|---|---|---|
| C1091 | Aprendizaje por refuerzo con preferencias humanas | Reinforcement learning from human feedback | Usa información humana para construir una señal de preferencia o recompensa y mejorar una política. La calidad del proceso depende de los datos, evaluadores, objetivos y método de optimización. |
| C1092 | Optimización directa de preferencias | Direct preference optimization | Ajusta una política a pares de respuestas preferidas bajo un objetivo que evita entrenar explícitamente un modelo separado de recompensa en el esquema original. No elimina sesgos de las preferencias. |
| C1093 | Ajuste supervisado por rechazo | Rejection sampling fine-tuning | Selecciona respuestas candidatas mediante un criterio y entrena supervisadamente con las aceptadas. La distribución seleccionada depende del generador y del procedimiento de filtrado. |
| C1094 | Selección de la mejor de N respuestas | Best-of-N sampling | Genera varios candidatos y elige el mejor según un evaluador declarado. Aumentar el número puede elevar coste y explotar defectos del evaluador, sin garantizar mayor calidad real. |
| C1095 | Modelo de recompensa | Reward model | Asigna puntuaciones aprendidas a resultados o comportamientos para representar una señal de preferencia. Optimizar su puntuación puede aprovechar errores de generalización del propio evaluador. |
| C1096 | Explotación de la recompensa | Reward hacking | Ocurre cuando un sistema logra una puntuación elevada aprovechando una señal imperfecta mientras incumple la intención buscada. No requiere que el sistema posea intenciones humanas. |
| C1097 | Supervisión escalable | Scalable oversight | Estudia cómo extender evaluación y orientación humanas a tareas difíciles de juzgar directamente. La asistencia de otros modelos también necesita validación y supuestos explícitos. |
| C1098 | Debate para supervisión | AI debate for oversight | Procedimiento en el que agentes presentan o cuestionan argumentos para facilitar una evaluación. Su utilidad depende de incentivos, reglas y capacidad de detectar argumentos engañosos. |
| C1099 | Extracción de conocimiento latente | Eliciting latent knowledge | Problema de obtener información que un modelo pueda representar internamente aunque sus respuestas habituales no la revelen fielmente. No presupone acceso directo a una verdad interna verificable. |
| C1100 | Interpretabilidad mecanicista | Mechanistic interpretability | Investiga mecanismos internos, representaciones y circuitos que explican comportamientos de modelos. Las intervenciones y explicaciones obtenidas suelen ser parciales y dependientes del contexto. |
