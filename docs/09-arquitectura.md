# Arquitectura y responsabilidades

Diseño propuesto, aún no implementado. SPA estática en Vue con Composition API y `<script setup lang="ts">`, TypeScript estricto, Vite, Vue Router y Pinia. Tailwind compilado con tokens CSS semánticos. No se incorpora backend. Ver [diagrama de componentes](diagrams/02-componentes.mmd) y [estructura de paquetes](diagrams/04-paquetes.mmd).

## Decisiones de tecnología

| Área | Decisión y motivo | Restricción |
|---|---|---|
| UI | Vue + composición; composables pequeños de coordinación | Sin cálculos del motor en watchers/componentes |
| Estado | Pinia para sesión, preferencias y progreso; refs locales para interacción | Tensores grandes fuera de reactividad profunda |
| Navegación | Vue Router, `createWebHashHistory` | GitHub Pages no exige reglas de reescritura de servidor |
| Estilos | Tailwind con plugin Vite y tokens CSS | Sin CDN; clases estáticas detectables; contraste validado |
| Gráficas | Módulos D3 de escalas, shapes, contours y arrays; SVG administrado por Vue | D3 no muta nodos DOM cuya propiedad controla Vue |
| Raster 2D | Canvas 2D para heatmap y muchos puntos | Overlay DOM/SVG y tabla con semántica accesible |
| 3D | Three.js lazy para paisaje, red y regresión 2D→1 | Controlar ciclo de vida, dispose y pérdida de contexto; alternativa 2D |
| PixiJS | Diferida, solo si medición demuestra necesidad | No cargar dos renderizadores GPU sin mejora demostrable |
| Matemáticas | Motor propio pequeño en TS y Float64Array | CPU determinista e inspección, sin autodiff opaco ni WebGPU |
| Validación | Zod para contratos externos, refinamientos de tamaños y finitud | Límite de bytes antes de parsear; versiones explícitas |
| CSV | Papa Parse con análisis por chunks y cancelación | Tipado explícito de columnas y separador/decimal configurables |
| Fórmulas | KaTeX local, carga diferida; texto alternativo | `trust:false`, sin HTML arbitrario en contenidos |
| Pruebas | Vitest, Vue Test Utils, fast-check, Playwright, axe | Separar unidad, integración, E2E y visual |
| Offline | Service Worker generado con Workbox, manifest PWA | Caché solo de recursos, no persistencia de modelos |

Se fijarán versiones compatibles y revisadas en D1. El entorno detectado Node 20.18.0 requiere actualización para el Vite propuesto; usar LTS compatible, mínimo 22.12 como base técnica consultada. No instalar herramientas globales como parte de la aplicación. La documentación de esta fase valida Mermaid con su propio conjunto mínimo de dependencias.

## Árbol objetivo

```text
src/
  app/                  # bootstrap, router, providers, manejo global de errores
  layouts/              # AppShell, LaboratoryLayout, WorkshopLayout
  features/
    datasets/           # import wizard, tabla, controles de defectos
    neuron/             # UI de L02
    architecture/       # constructor y presets de topología
    activations/        # comparadores de funciones
    propagation/        # timeline y detalle de operaciones
    training/           # controles, estados y telemetría
    optimization/       # superficies y comparación de optimizadores
    generalization/     # regularización y comparación train/val
    evaluation/         # clasificación, regresión, test final
    vision/             # kernel, mapas y pooling
    experiments/        # biblioteca, comparación e informes
    workshops/          # intérprete declarativo y progreso
    glossary/           # índice y búsqueda
    settings/           # panel de preferencias
  domain/
    math/               # matrices, RNG, estadística, utilidades numéricas
    data/               # recetas, defectos, split, transformadores
    network/            # topología, parámetros, forward, backward, BN
    training/           # lotes, optimizadores, schedulers, regularización
    evaluation/         # pérdidas, métricas, baselines
    vision/             # correlación, padding y pooling
    experiments/        # invariantes, hashes y versiones
  application/
    use-cases/          # preparar, entrenar, comparar, guardar, exportar
    ports/              # TrainingExecutor, ExperimentRepository, FileGateway
  infrastructure/
    workers/            # entry worker, protocolo, cliente y supervisión
    persistence/        # LocalStorage, migraciones, presupuesto
    serialization/      # schemas, parseadores CSV/JSON y exportadores
    offline/            # registro SW, actualización y estado de caché
  visualization/
    svg/                # red, curvas y matrices con D3/Vue
    canvas/             # heatmap y scatter raster
    three/              # escenas, cámara, picking y liberación GPU
    adapters/           # snapshots a view-models y coordenadas
  shared/
    ui/                 # campos, botones, diálogos, tabs, errores
    composables/        # media query, foco, resize y reloj visual
    types/              # tipos compartidos pequeños
  stores/               # preferences, session, library, workshops
  content/
    concepts/           # registro abierto de conceptos, traducciones y fórmulas
    lessons/            # explicaciones vinculadas a conceptos
    workshops/          # ocho definiciones declarativas
    presets/            # recetas y configuraciones
  assets/               # estilos, iconos y fuentes locales si se adoptan
tests/
  unit/ integration/ e2e/ visual/ fixtures/ performance/
public/                 # manifest e iconos; no datasets personales
docs/                   # especificación, ADR, diagramas y guías
```

La estructura anterior es una propuesta, no una lista de carpetas vacías ya creadas. Dentro de cada feature separar `components/`, `composables/`, `pages/` y `types/` solo cuando haya contenido real. No crear un framework de plugins para doce vistas conocidas.

## Dirección de dependencias

Dominio → solo tipos y módulos del propio dominio. Aplicación → dominio y puertos. Infraestructura → implementa puertos. Features → casos de uso, stores y visualización pública. Visualización → view-models sin controlar entrenamiento. `app` ensambla dependencias. ESLint bloquea imports invertidos y ciclos; alias `@domain`, `@application`, `@infra`, `@features`, `@viz`.

Principios: una responsabilidad por módulo, cálculo puro donde sea posible, estado mutable encapsulado por sesión, contratos pequeños y composición sobre herencia. Optimizadores y transformadores implementan interfaces concretas; no hay contenedor de inyección complejo. Los fixtures prueban comportamientos públicos y no acceden por corte de texto fuente.

## Estado y ejecución

Una sesión mantiene configuración, IDs de dataset/split, estado del executor y snapshot actual. El Worker es propietario de buffers de parámetros y estado del optimizador. UI guarda copias resumidas e inmutables mediante `shallowRef`; no convierte matrices en proxies. Un checkpoint se transfiere mediante copia explícita: transferir un ArrayBuffer vivo lo separaría de su propietario.

Un Worker de sesión ejecuta entrenamiento o una tarea de análisis pesado, nunca ambas a la vez. Corte de pérdida y múltiples semillas se encolan tras pausar entrenamiento. Parseo y generación grande usan tareas acotadas en el mismo executor antes del modelo; el controlador puede terminar el Worker e inicializar una sesión nueva desde un checkpoint finito. A/B usa dos contextos independientes ejecutados secuencialmente.

El reloj visual consume snapshots; interpolar posiciones/pulsos es cosmético y se etiqueta cuando representa una muestra. Se publica telemetría como máximo 10 Hz y parámetros reducidos a 5 Hz; curvas train/val como máximo una entrada por época. Máximo 2.000 puntos de historial en memoria mediante decimación que conserva extremos y épocas originales, mientras resúmenes/best checkpoint se conservan aparte.

## Puertos principales

`TrainingExecutor`: initialize, run, pause, stepBatch, stepEpoch, cancel, inspect, checkpoint y dispose. `ExperimentRepository`: list, read, save, remove, migrate y usage. `FileGateway`: parseDataset, importModel, importExperiment y export. Cada operación puede devolver un resultado discriminado `ok | validationError | capacityError | unavailable | internalError`, sin exponer errores técnicos al alumno.

## ADR propuestos

| ADR | Decisión | Consecuencia / alternativa descartada por ahora |
|---|---|---|
| ADR-001 | Motor TS explícito con Float64 | Inspección y gradientes verificables; más trabajo que delegar todo a TensorFlow.js |
| ADR-002 | Worker propietario de cómputo | Protocolo y cancelación necesarios; no acoplar épocas a rAF |
| ADR-003 | SVG + Canvas + Three.js | Cada renderer tiene responsabilidad acotada; Pixi pendiente de benchmark |
| ADR-004 | LocalStorage acotado + archivos | Cumple uso local, exige presupuestos; IndexedDB requiere nueva decisión si cambia alcance |
| ADR-005 | Hash routing + base de Vite | Recarga segura en Pages; URL con `#` aceptada |
| ADR-006 | Tres formatos: dataset, modelo y experimento | Inferencia y reanudación no se confunden; más contratos que validar |
| ADR-007 | Documentación antes de aplicación | Esta revisión no contiene UI funcional ni pruebas de producto ejecutadas |
| ADR-008 | Un solo estado matemático para 2D y 3D | Vistas equivalentes y accesibles; no ejecutar motores separados por vista |

Estado de todos los ADR: **propuestos para revisión**. Si se modifica alguno, conservar motivo, alternativa y efecto en requisitos/pruebas. [Fuentes oficiales](18-fuentes.md).
