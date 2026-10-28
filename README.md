# Neural Atlas

**Aprende aprendizaje automático viendo qué hace una red neuronal y por qué.** Aplicación educativa en español para FP de especialización y universidad. Experimenta con datos, construye redes, entrénalas y contrasta sus predicciones mediante gráficos, cálculos inspeccionables y actividades guiadas.

[Abrir aplicación](https://franmatias.github.io/neural-atlas/) · [Laboratorios](https://franmatias.github.io/neural-atlas/#/laboratorios) · [Primer taller acompañado](https://franmatias.github.io/neural-atlas/#/taller/ejemplo) · [Glosario](https://franmatias.github.io/neural-atlas/#/glosario)

Versión **1.5.0**: **14 laboratorios, 12 talleres de investigación y 752 fichas de conceptos** —152 con actividades y 600 referencias de consulta— en un catálogo ampliable. D1–D10, X1 y X2 están implementados; la validación con alumnado y la aceptación docente siguen pendientes.

![Entrenamiento y curvas reales](docs/implementation/d4-training.png)

## Qué permite hacer

- **Preparar datos:** generar ejemplos sintéticos, inducir ruido y fallos, usar Iris/Wine con procedencia documentada o importar CSV/JSON. Explorar características y objetivos, dividir train/validación/test y ajustar el preprocesado con train.
- **Entender una red:** inspeccionar pesos, sesgos, activaciones, propagación y gradientes. Comparar arquitecturas y comprobar por qué XOR necesita no linealidad.
- **Entrenar paso a paso:** usar SGD, Momentum, RMSprop o Adam, controlar tasa y lote, pausar y observar curvas reales. Experimentar con regularización, dropout, normalización por lotes, aumento de datos y parada temprana.
- **Ver el descenso simultáneamente en 2D y 3D:** relacionar contornos, superficie, coordenadas y pérdida; explorar un paso calculable, oscilación, divergencia y puntos de silla.
- **Clasificar visualmente:** entrenar un sandbox de dos clases o un clasificador multiclase, editar puntos, probar entradas y observar regiones y probabilidades.
- **Evaluar y comparar:** interpretar métricas, calibración, ROC/PR y costes; realizar comparaciones A/B, validación cruzada, estudios de robustez y métricas por grupos. Comparar kNN, árboles y MLP, explorar rejillas acotadas e importancia por permutación.
- **Investigar y conservar evidencia:** formular hipótesis en talleres, ejecutar casos con el motor y redactar conclusiones. Guardar experimentos, importar/exportar datasets y modelos y preparar paquetes didácticos.

## Empieza en diez minutos

1. Abre [Tu primer taller, acompañado](https://franmatias.github.io/neural-atlas/#/taller/ejemplo) y mira el ejemplo completo resuelto.
2. Recorre **predecir → configurar → ejecutar → observar → explicar** con tus decisiones. Hay ayudas y puedes equivocarte en la predicción sin bloquearte.
3. Compara cómo se desplaza una frontera al variar el sesgo y descarga el cuaderno del ejemplo.
4. Pasa a [Talleres](https://franmatias.github.io/neural-atlas/#/taller) o elige un laboratorio para investigar por tu cuenta.

La introducción es una práctica independiente en memoria: recargar la reinicia. La descarga conserva notas y evidencia, pero no se importa como progreso T02. Los talleres reales tienen su propio guardado y exportación.

## Los catorce laboratorios

| Laboratorio | Qué permite comprender |
| --- | --- |
| [L01 · Datos antes que modelos](https://franmatias.github.io/neural-atlas/#/lab/datos) | Features, etiquetas, particiones y transformaciones sin fuga |
| [L02 · Una neurona](https://franmatias.github.io/neural-atlas/#/lab/neurona) | Pesos, sesgo, suma y salida |
| [L03 · Arquitectura y XOR](https://franmatias.github.io/neural-atlas/#/lab/arquitectura) | Capas, capacidad y separación no lineal |
| [L04 · Activación y gradientes](https://franmatias.github.io/neural-atlas/#/lab/activaciones) | Funciones de activación, pendientes y saturación |
| [L05 · Del cálculo al gradiente](https://franmatias.github.io/neural-atlas/#/lab/propagacion) | Forward, backpropagation y actualización de parámetros |
| [L06 · Entrenar con criterio](https://franmatias.github.io/neural-atlas/#/lab/entrenamiento) | Optimizadores, lotes, curvas e historial de configuración |
| [L07 · Paisajes de pérdida](https://franmatias.github.io/neural-atlas/#/lab/optimizacion) | El mismo descenso sincronizado en 2D y 3D |
| [L08 · Aprender sin memorizar](https://franmatias.github.io/neural-atlas/#/lab/generalizacion) | Regularización, generalización, semillas y capacidad |
| [L09 · Clasificar y evaluar](https://franmatias.github.io/neural-atlas/#/lab/clasificacion) | Matriz de confusión, probabilidades, umbrales y costes |
| [L10 · Regresión y residuos](https://franmatias.github.io/neural-atlas/#/lab/regresion) | Predicción numérica, errores y aproximación de funciones |
| [L11 · Del píxel al mapa](https://franmatias.github.io/neural-atlas/#/lab/vision) | Kernels, ventanas, stride, padding, ReLU y pooling |
| [L12 · Laboratorio de hipótesis](https://franmatias.github.io/neural-atlas/#/lab/experimentos) | Comparación controlada, validación cruzada y robustez |
| [L13 · Sandbox de dos clases](https://franmatias.github.io/neural-atlas/#/lab/arquitectura/frontera) | Fronteras binarias y sondas interactivas |
| [L14 · Clasificador visual multiclase](https://franmatias.github.io/neural-atlas/#/lab/clasificacion/visual) | Regiones, red y probabilidades de varias clases |

Las guías explican qué observar y cómo interpretar los resultados. Visión inspecciona operaciones de imagen; no entrena una CNN completa. Los ejemplos acotados y las proyecciones no representan cualquier problema real de ML.

## Para docentes

Los talleres incorporan hipótesis, configuración, ejecución, observación y explicación, con evidencia real y rúbricas de valoración humana. [Docencia](https://franmatias.github.io/neural-atlas/#/docencia) permite intercambiar paquetes didácticos JSON. El glosario incluye búsqueda, filtros, paginación, mapa de conceptos y [repaso](https://franmatias.github.io/neural-atlas/#/repaso).

El **paquete de aula 1.5.0-r1** prepara la validación del recurso: acogida con ejemplo resuelto, doce actividades, cuestionarios A/B, solucionario, cinco registros vacíos y procedimientos para el piloto, el análisis y la aceptación.

[Descargar paquete de aula](docs/downloads/neural-atlas-aula-v1.5.0.zip) · [Instrucciones](docs/classroom/LEEME.md) · [Paso 2: piloto](docs/classroom/06-ejecucion-piloto.md) · [Paso 3: análisis](docs/classroom/07-analisis-resultados.md) · [Paso 4: aceptación](docs/classroom/08-aceptacion-docente.md)

El ZIP contiene Markdown/CSV y no se importa en Docencia. Los procedimientos están preparados, sin resultados de alumnado ni acta firmada. Siguen pendientes el piloto, el análisis de datos reales, la revisión con lector/dispositivos del centro y la aceptación humana.

## Interfaz, almacenamiento y uso sin conexión

Interfaz responsive con tema claro/oscuro, ajustes, movimiento regulable y sonido voluntario en actividades compatibles. El entrenamiento y otros cálculos se ejecutan en Web Workers para mantener la interfaz disponible.

Los datos, modelos y cuadernos se procesan y conservan en el navegador. LocalStorage almacena preferencias e IndexedDB guarda biblioteca y cuadernos. La sesión activa vive en memoria; hay recuperación automática para el motor CPU compatible y guardado manual de experimentos. Exporta lo que necesites conservar: borrar los datos del navegador puede eliminar las copias locales. Un modelo de inferencia y un experimento completo contienen información distinta.

Desde [Sin conexión](https://franmatias.github.io/neural-atlas/#/sin-conexion) se prepara y verifica la caché de la PWA. Hace falta una primera carga con conexión; los recursos externos enlazados no quedan disponibles automáticamente. Antes de actualizar, exporta el trabajo, detén cálculos y sigue el panel de actualización.

## Ejecutar el proyecto

Requiere **Node 24.19.0**, indicado en [.nvmrc](.nvmrc).

```powershell
npm ci --ignore-scripts
npm run dev
```

Abre [la aplicación local](http://127.0.0.1:5173/neural-atlas/). Para producción: `npm run build` y `npm run preview` (puerto 4173).

Vue 3 con Composition API, TypeScript, Vite, Tailwind, Pinia, Vue Router, D3 y Three.js. El proyecto separa contenido, dominio/aplicación, infraestructura, stores y vistas por funcionalidad. La [documentación de diseño](docs/README.md) recoge requisitos, arquitectura, contratos y diagramas Mermaid.

## Verificación y publicación

```powershell
npm run check
npx playwright install chromium firefox webkit
npm run test:e2e
```

`check` revisa tipos, estilo, unidades/integración, cobertura con umbrales, compilación, presupuesto de carga y documentación. Playwright verifica recorridos de producción, accesibilidad automática, teclado, almacenamiento, temas y responsive en tres motores. Informes: `coverage/` y `playwright-report/`.

La entrega de aplicación 1.5.0 superó **644 pruebas unitarias/integración y 447 pruebas E2E**, además de comprobaciones tempranas y del recorrido público tras desplegar. Son verificaciones técnicas; no sustituyen al lector real ni a la valoración pedagógica.

GitHub Actions publica `main` en Pages después de superar las puertas de calidad y comprueba la aplicación HTTPS. Consulta el [plan de CI](docs/24-despliegue-pages.md), el [taller introductorio](docs/60-taller-resuelto-y-acompanamiento.md), la [actualización del paquete](docs/61-paquete-aula-v15.md) y el [estado de aceptación](docs/59-pendientes-y-revision-teclado.md).

Para regenerar o comprobar el ZIP de aula se usa Python 3, sin dependencias adicionales:

```powershell
python scripts/build-classroom-kit.py
python scripts/build-classroom-kit.py --check
```

Los informes de entregas permanecen en [docs/](docs/README.md) como evidencia histórica. El proyecto original está en la carpeta hermana `simulador-redes-neuronales`; este repositorio tiene historial Git independiente con ramas y fusiones por incremento.
