# Auditoría del simulador de partida

Revisión: 22/10/2026. Fuente local: carpeta hermana `simulador-redes-neuronales`. Se consideran evidencia del producto sus archivos y pruebas, sin convertir las instrucciones de su README en acciones de publicación.

## Inventario y comportamiento observado en código

| Elemento | Evidencia | Consecuencia |
|---|---|---|
| Siete módulos | `index.html`, `README.md`, `setModule` | Conservar objetivos de neurona, XOR, backprop, sandbox, optimización, CNN y multiclase |
| Aplicación sin compilación | `package.json` solo declara `node --test` | Migración a módulos TS y componentes Vue |
| Código concentrado | `js/app.js`, 197.692 bytes y más de 4.000 líneas | Separar dominio, ejecución, vistas, recursos y persistencia |
| Dependencias externas en ejecución | CDN de Tailwind y Font Awesome en HTML | Empaquetar recursos para funcionamiento sin conexión |
| Persistencia de tema | `applyTheme`, acceso directo a LocalStorage | Repositorio versionado, captura de errores y migraciones |
| Diferentes motores | `SimpleMLP`, funciones `m3*`, clasificador `m7` | Un motor de referencia compartido para evitar divergencias pedagógicas |
| Pruebas acopladas al texto fuente | `sourceBetween`, `vm.runInContext` | Importaciones públicas del dominio y pruebas de contrato |

## Correcciones justificadas

1. **Derivada de ReLU:** `SimpleMLP.backward` usa `0.01` cuando la activación no es positiva. Para ReLU debe ser cero en valores negativos; en cero se adoptará explícitamente el subgradiente cero. Leaky ReLU se ofrecerá como función distinta.
2. **Inicialización:** uniforme en `[-sqrt(2/fanIn), sqrt(2/fanIn)]` tiene varianza `2/(3 fanIn)`. No debe presentarse como He estándar. El nuevo motor definirá Xavier uniforme y He normal con sus fórmulas y pruebas de varianza.
3. **Barajado:** `currentData.sort(() => Math.random() - 0.5)` no genera un barajado uniforme y depende del orden de comparación. Sustituir por Fisher–Yates con generador sembrado.
4. **Entrenamiento y dibujo:** `mainLoop` ejecuta épocas por fotograma. Separar reloj visual, presupuesto de cálculo y contadores matemáticos.
5. **Bloqueo potencial:** `trainClassifier` ejecuta 80 épocas de forma síncrona. Trasladar entrenamiento al Worker y permitir cancelación entre unidades de trabajo acotadas.
6. **Comparación de algoritmos:** el clasificador combina estrategia de muestreo y tasa de aprendizaje fija por estrategia. Presentar por separado tamaño de lote, optimizador y tasa, permitiendo experimentos controlados.
7. **Evaluación:** las métricas visibles se calculan sobre los datos usados para entrenar. Diseñar particiones independientes y bloquear el conjunto de prueba durante el ajuste.

## Verificación realizada

Se ejecutó `npm test` en el proyecto original, sin modificarlo: **11 pruebas correctas, 0 fallidas**. Cubren activaciones, XOR, gradientes seleccionados, datasets, superficies, CNN y multiclase. El resultado no demuestra cobertura completa ni funcionamiento visual en todos los navegadores. No se midió cobertura del original ni se ejecutaron pruebas E2E.

Herramientas locales observadas: Node 20.18.0, npm 11.19.1, Git 2.55.0. El runtime de la futura aplicación deberá actualizarse según [la decisión de plataforma](09-arquitectura.md).

## Estrategia de evolución

Reescribir la estructura conservando las ideas didácticas y pequeños ejemplos numéricos verificables. No copiar el estado global ni la manipulación de DOM. Preservar el original como referencia comparativa; no depende de él el nuevo repositorio en ejecución. La revisión visual y de accesibilidad de la futura interfaz pertenece a la fase de implementación.
