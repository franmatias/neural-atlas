# Neural Atlas · cierre técnico v1.1

Fecha: 27/10/2026. Este informe reúne el alcance implementado de D1–D10 y sus límites. No sustituye la aceptación docente en aula ni presenta las extensiones X1/X2 como entregadas. La publicación pasa por el workflow de calidad y el smoke público; su resultado verificable permanece en GitHub Actions.

## Qué puede hacerse

Los catorce accesos del catálogo de laboratorios incluyen los doce originales y los dos laboratorios visuales añadidos por petición del usuario: sandbox binario y clasificador multiclase. El motor CPU enseña datos/split/pipeline, neurona, arquitectura, activaciones, forward/backward, entrenamiento, generalización, clasificación, regresión, comparación, paisajes 2D/3D y filtros de visión. Los informes anteriores conservan sus decisiones y pruebas.

| Entrega | Evidencia de implementación |
|---|---|
| D1–D3 | [Shell](23-implementacion-d1.md), [datos](25-implementacion-d2.md), [neuronas y red](26-implementacion-d3.md) |
| D4–D6 | Informes 29–40: Worker de entrenamiento, archivos, biblioteca, regularización, recuperación, evaluación, semillas, capacidad y tamaño de datos |
| D7 | [Comparación, CV, transformaciones, dispersión, deriva, proyección y segmentos](44-cierre-d7.md) |
| D8 | [Evaluación probabilística](45-evaluacion-probabilidades.md), funciones y [ética por grupos](47-etica-y-cierre-d8.md) |
| D9 | [Paisajes](48-paisajes-perdida.md), [visión](49-vision-kernels.md), [doce talleres y ocho fallos](50-talleres-investigacion.md) |
| D10 | [Diseño de catálogo, repaso, docencia y offline](51-catalogo-repaso-y-paquetes.md), contratos, interfaz y pruebas descritos aquí |

## D10 · historias y comprobaciones

| Historia | Resultado revisable | Pruebas reales |
|---|---|---|
| US-044 · RF-068 | Registro abierto; importación en Worker, preview, versiones, procedencia, relaciones, retirada y exportación | `concept-packs`, `core-catalog`, `learning-catalog`, `learning-library` |
| US-051 · RF-074 | Grafo acotado y lista topológica completa, paginada, filtrable y accesible | `learning-catalog` integración/E2E y axe |
| US-052 · RF-075 | MCQ/VF, explicación tras corregir, calendario Leitner local, cinco respuestas, versiones, exportación y reinicio confirmado | `review`, `learning-catalog` integración/E2E |
| US-053 · RF-076 | Paquete docente completo con guía, talleres, datasets, presets comunes, referencias y soluciones opcionales | `teaching-packs`, `teaching` integración/E2E |
| US-060 · RF-083 | Error frecuente → preview de FailureCase → apertura explícita de T12 archivando el intento anterior | `learning-catalog` E2E; talleres y motor ya comprobados en D9 |
| US-038 · RF-056/057 | Manifiesto, precaché verificable, uso offline y actualización explícita protegida | `offline-client`, `offline` integración/E2E, generador de build y smoke |

Los identificadores P-I10b/P-I13/P-E13, P-Q06/07/08/15 y P-O01/02/03/P-E17 del plan son trazas de aceptación; la tabla anterior los vincula a archivos ejecutables, no a resultados inventados. Las pruebas de navegador se ejecutan en Chromium, Firefox y WebKit en CI; la comprobación local de Windows usa Chromium y WebKit.

## Catálogo y repaso

652 IDs publicados: C001–C152 desarrollados y C153–C652 de consulta. De los originales, 147 tienen actividad implementada y cinco comparadores de X1 conservan estado `specified`: C143/C144/C145/C146/C151. Una ficha desarrollada contiene definición de 40–80 palabras, intuición/límite, notación/dimensiones, ejemplo estático, error/corrección, pregunta explicada, actividad/evidencia, relaciones y fuentes. El ejemplo C021 conserva z=0,44 y salida≈0,608259; la lectura viva de la neurona se muestra aparte.

Los paquetes locales siempre muestran procedencia no revisada, aunque declaren `reviewed`. IDs, slugs y versiones tienen continuidad histórica. No se interpreta HTML ni se evalúan fórmulas recibidas. Un paquete no incorpora nuevos controles del motor. El DAG comprueba prerrequisitos; las relaciones recíprocas no se confunden con ciclos de aprendizaje.

El repaso no califica competencia: visitar, explicar y responder son actividad local. Las cajas 1–5 programan 1/3/7/14/30 días; error vuelve a caja 0 y propone mañana. La aritmética de calendario es pura y contempla años bisiestos, cambio de mes y año. El reloj local vive en infraestructura. Cambiar contentVersion reinicia la práctica compatible; un fallo de guardado no se anuncia como persistido y la respuesta pendiente puede exportarse.

## Docencia y almacenamiento

La preparación permite editar identidad, título, objetivos, secuencia y atribuciones; elegir talleres y añadir los datos actuales y, opcionalmente, el experimento detenido. La guía completa incluye prerrequisitos, tiempo, errores, debate y accesibilidad. El JSON exportado puede editarse y volver a validarse. Excluir soluciones elimina realmente ese campo; incluirlas no pretende ocultarlas después.

Las relaciones internas indican qué recursos acompañan cada taller. Los talleres ejecutan los casos didácticos registrados de T01–T12; aplicar datos/presets en los laboratorios es una acción separada. No se promete que importar un dataset cambie automáticamente el motor de una actividad POE. Restaurar datos o experimento exige una confirmación concreta y ofrece exportar la sesión anterior.

IndexedDB v4 añade `contentCatalog`, `learningReview` y `teachingPacks` sin borrar los stores anteriores. Conceptos/docencia comparten 16 MiB; repaso/evidencia comparte 8 MiB. Los límites de archivo son independientes: conceptos 4 MiB/500 registros/32 KiB por ficha; docencia 64 MiB/12 talleres/100 presets. Un archivo docente válido puede superar el presupuesto de instalación: conserva preview para usar/exportar en memoria. No se expulsan datos automáticamente. La revisión esperada y `transaction.complete` gobiernan el guardado; abortos/cuota/conflictos preservan el registro anterior.

## ADR-009 · precaché explícita y verificación por recurso

Se revisa la selección inicial de Workbox de los documentos 09/12: se usa un generador pequeño de build con el manifiesto real de Vite y un Service Worker propio. Motivo: verificar SHA-256 de cada recurso, incluir los tres Workers y todos los chunks perezosos, controlar instalación/espera y probar el protocolo directamente, sin añadir un segundo sistema de empaquetado. La alternativa sigue siendo Workbox si el alcance de caché o sincronización creciera.

`build-offline.mjs` enumera recursos reales, excluye sourcemaps y metadatos internos, impone 8 MiB gzip y deriva el nombre de caché del contenido y del runtime. La instalación descarga con concurrencia cuatro y solo escribe el marcador listo al terminar todas las verificaciones. Un fallo espera que terminen las solicitudes antes de retirar la caché incompleta, conservando la versión activa anterior. No se cachean experimentos, archivos de usuario ni rutas arbitrarias del origen.

El usuario prepara el dispositivo desde Inicio o Ajustes → Uso sin conexión. La primera visita necesita red. El estado disponible exige marcador y presencia de todos los recursos; si falta uno, la preparación permite reparar la caché de esa misma versión. Las fuentes HTTPS externas necesitan conexión. Instalación como aplicación depende de las funciones ofrecidas por cada navegador.

Una versión nueva espera sin `skipWaiting` automático. Activación explícita requiere confirmar copia del trabajo, detener entrenamiento/cálculos/guardados y cerrar las otras pestañas de Neural Atlas. El Worker comprueba también las ventanas dentro de su scope antes de aceptar. Solo entonces se activa y recarga. El contenido en RAM no se declara guardado por actualizar: se ofrecen exportaciones de dataset, experimento y cuaderno, y enlaces a paquetes en memoria. La recuperación automática conserva su política y no se sustituye silenciosamente la copia de otra pestaña.

El scope es `/neural-atlas/`. Se limpian únicamente cachés con el prefijo de estáticos de Neural Atlas. IndexedDB permanece separado. Se mantiene la advertencia del diseño: compartir origen en GitHub Pages comparte cuota y acceso potencial; los nombres no proporcionan aislamiento de seguridad.

## Correcciones verificadas durante el cierre

La puerta de CI identificó un desbordamiento de los selectores de archivo con fuentes nativas de Linux, además de una carrera al retirar y volver a importar un paquete. Se corrigen los tamaños intrínsecos con width/max-width/min-width explícitos, controles de texto fluidos y botones ajustables, sin ocultar el desbordamiento de la página. Los estilos compartidos de aprendizaje se separan en `styles/learning.css`.

La retirada mantiene la ficha visible y la importación bloqueada hasta que termina la transacción. La lectura de archivos también bloquea acciones incompatibles; cancelar o navegar invalida las respuestas tardías. Dos pruebas nuevas mantienen una escritura y una lectura pendientes de forma controlada. CI repite tres veces las regresiones críticas en Chromium/WebKit antes de ejecutar toda la batería de tres navegadores; no se reducen los umbrales ni se aceptan casos flaky.

## Evidencia local de la entrega

- 584 pruebas unitarias y de integración, en 70 archivos, superadas.
- Cobertura medida: 92,42% líneas, 91,62% sentencias, 90,78% ramas y 86,21% funciones; umbrales de cada capa superados.
- Catálogo de navegador: 390 casos, 130 por Chromium/Firefox/WebKit, sujeto a la puerta completa de CI antes de publicar.
- Build: 120 recursos offline, aproximadamente 724 KiB gzip; entrada inicial 62,34 KiB JS y 12,06 KiB CSS gzip, dentro de presupuesto.
- 55 documentos, 369 enlaces locales, 30 fuentes Mermaid y 73 diagramas incluidos en Markdown validados en el momento de la entrega.
- Smoke de producto completo en la subruta local superado, incluido el paquete docente con el experimento activo de dos actualizaciones. El smoke público forma parte obligatoria del despliegue.

Capturas reproducibles con `node scripts/capture-learning.mjs`:

[Concepto](implementation/d10-concept.png) · [Mapa](implementation/d10-map.png) · [Repaso](implementation/d10-review.png) · [Guía docente](implementation/d10-teaching.png) · [Disponibilidad offline](implementation/d10-offline.png) · [Móvil oscuro](implementation/d10-mobile.png).

## Verificación y límites de aceptación

`npm run check`: tipos, lint, unidad/integración, cobertura, build, presupuesto de transferencia, CSP y documentación. Umbrales conservados: global 85% líneas/funciones y 80% ramas; dominio 95/95/90; aplicación e infraestructura 90/90/85. Se limita a dos workers de pruebas para que el paralelismo no distorsione cálculos ni agote memoria. CI amplía su tiempo disponible de 20 a 30 minutos al crecer la suite; no elimina comprobaciones ni acepta pruebas flaky.

`npm run test:e2e`: navegadores, teclado, temas, anchura móvil, contraste, persistencia, archivos y Workers reales. Los ensayos offline usan un servidor HTTP temporal con versiones y descargas interrumpidas controladas: primera visita sin caché, precaché completa, archivos/motores sin red, reparación, actualización en espera, dos pestañas y conservación de cachés de otro proyecto. El smoke público recorre el producto desplegado y conserva la sesión de entrenamiento a través de los nuevos módulos.

La aceptación pedagógica permanece abierta: observación de uso en FP/universidad, claridad de analogías, carga cognitiva, tiempos de actividades y revisión de explicaciones por un docente. X1/X2 quedan propuestos, especialmente comparadores kNN/árbol/grid/permutación y ampliaciones posteriores. Este cierre técnico no certifica eficacia educativa ni justicia estadística de un modelo.

Fuentes técnicas: [ciclo de vida de Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers), [API Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API). Las fuentes matemáticas y educativas están ligadas a cada ficha y a los informes del motor.
