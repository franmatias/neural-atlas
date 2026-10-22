# Arquitectura y responsabilidades

Arquitectura del alcance completo; D1 ya implementa la SPA, dominio de neurona, preferencias y vistas descritos en [el informe de implementación](23-implementacion-d1.md). Los módulos restantes siguen como diseño objetivo. SPA estática en Vue con Composition API y `<script setup lang="ts">`, TypeScript estricto, Vite, Vue Router y Pinia. Tailwind compilado con tokens CSS semánticos. No se incorpora backend. Ver [diagrama de componentes](diagrams/02-componentes.mmd) y [estructura de paquetes](diagrams/04-paquetes.mmd).

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
| Validación | Zod lazy para contratos externos, refinamientos de tamaños y finitud | Límite de bytes antes de parsear; versiones explícitas |
| CSV | Papa Parse lazy con análisis por chunks y cancelación | Tipado explícito de columnas y separador/decimal configurables |
| Fórmulas | KaTeX local, carga diferida; texto alternativo | `trust:false`, sin HTML arbitrario en contenidos |
| Pruebas | Vitest, Vue Test Utils, fast-check, Playwright, axe | Separar unidad, integración, E2E y visual |
| Offline | Service Worker generado con Workbox, manifest PWA | Caché solo de recursos, no persistencia de modelos |

Plataforma **Node 24 LTS**, versión exacta/lockfile verificados en D1; Node 20 no es plataforma admitida. La revisión documental usa Node 24.19.0 disponible, sin instalación global. Chunk inicial: Vue, Router, Pinia, shell, tokens y vistas mínimas; no incluye Zod, Papa Parse, KaTeX, D3 avanzado, Three.js, Worker ni contenido completo del catálogo. Importadores, matemáticas, contenidos y gráficos se cargan por ruta/tarea; P-P03 inspecciona el grafo de chunks real, no basta con escribir import dinámico si hay otro import eager.

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
    learning/           # POE, diagnóstico, grafo y repaso por entregas
    settings/           # panel de preferencias
  domain/
    math/               # matrices, RNG, estadística, utilidades numéricas
    data/               # recetas, defectos, split, transformadores
    network/            # topología, parámetros, forward, backward, BN
    training/           # lotes, optimizadores, schedulers, regularización
    evaluation/         # pérdidas, métricas, baselines
    vision/             # correlación, padding y pooling
    experiments/        # invariantes, hashes y versiones
    learning/           # reglas declarativas de observación y evidencia, sin IA
  application/
    use-cases/          # preparar, entrenar, comparar, guardar, exportar
    ports/              # TrainingExecutor, ExperimentRepository, FileGateway
  infrastructure/
    workers/            # entry worker, protocolo, cliente y supervisión
    persistence/        # IndexedDB biblioteca/checkpoints; LocalStorage ajustes/progreso
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

Dominio → tipos y módulos propios, más una dependencia matemática pura SHA-256 explícitamente permitida; ninguna API de plataforma. Aplicación → dominio y puertos. Infraestructura → implementa puertos. Features → casos de uso, stores y visualización pública. Visualización → view-models sin controlar entrenamiento. `app` ensambla dependencias. ESLint bloquea imports invertidos y ciclos; alias `@domain`, `@application`, `@infra`, `@features`, `@viz`.

Principios: una responsabilidad por módulo, cálculo puro donde sea posible, estado mutable encapsulado por sesión, contratos pequeños y composición sobre herencia. Optimizadores y transformadores implementan interfaces concretas; no hay contenedor de inyección complejo. Los fixtures prueban comportamientos públicos y no acceden por corte de texto fuente.

Los módulos de POE y diagnóstico consumen eventos/snapshots por puertos de solo lectura; no escriben pesos ni alteran training. El reloj de repetición/fechas queda en infraestructura; reglas de comparación son puras. Mini-mapas usan adapters del mismo modelo con presupuesto cooperativo, sin un segundo motor. Modelos kNN/árbol son extensiones posteriores con contrato discriminado antes de implementar, no se añaden como capas falsas de MLP. Detalle en [experiencias](22-experiencias-educativas.md).

## Estado y ejecución

Una sesión mantiene configuración, IDs de dataset/split, estado del executor y snapshot actual. El Worker es propietario de buffers de parámetros y estado del optimizador. UI guarda copias resumidas e inmutables mediante `shallowRef`; no convierte matrices en proxies. Un checkpoint se transfiere mediante copia explícita: transferir un ArrayBuffer vivo lo separaría de su propietario.

Un Worker de sesión ejecuta entrenamiento o una tarea de análisis pesado, nunca ambas a la vez. Corte de pérdida y múltiples semillas se encolan tras pausar entrenamiento. Parseo y generación grande usan tareas acotadas en el mismo executor antes del modelo; el controlador puede terminar el Worker e inicializar una sesión nueva desde un checkpoint finito. A/B usa dos contextos independientes ejecutados secuencialmente.

Reloj visual y límite de actualizaciones/s son independientes. PROGRESS barato tiene techo 10 Hz; mapas se adaptan a coste/red/dispositivo con presupuesto del 10 % y pueden actualizar solo en pausa. Curvas train/val una entrada por época; todas las vistas indican antigüedad de su snapshot. Máximo 2.000 puntos de historial con decimación que conserva extremos/épocas, sin inventar medidas. El controlador mantiene checkpoint inicial y dos copias RAM automáticas; IDB conserva recuperación periódica. Troceo BN por capa y fase, con estadísticas de lote completo. Contrato detallado en [Worker](11-datos-y-protocolo-worker.md).

## Puertos principales

`TrainingExecutor`: initialize, run, pause, stepBatch, stepEpoch, cancel, inspect, checkpoint y dispose. `ExperimentRepository`: list, read, save, remove, migrate y usage. `FileGateway`: parseDataset, importModel, importExperiment y export. Cada operación puede devolver un resultado discriminado `ok | validationError | capacityError | unavailable | internalError`, sin exponer errores técnicos al alumno.

## ADR propuestos

| ADR | Decisión | Consecuencia / alternativa descartada por ahora |
|---|---|---|
| ADR-001 | Motor TS explícito con Float64 | Inspección y gradientes verificables; más trabajo que delegar todo a TensorFlow.js |
| ADR-002 | Worker propietario de cómputo | Protocolo y cancelación necesarios; no acoplar épocas a rAF |
| ADR-003 | SVG + Canvas + Three.js | Cada renderer tiene responsabilidad acotada; Pixi pendiente de benchmark |
| ADR-004 | IndexedDB para datos/modelos/checkpoints; LocalStorage solo preferencias/progreso | Revisa la propuesta 0.1: transacciones asíncronas y buffers binarios soportan arquitectura máxima; cuotas reales siguen comprobándose |
| ADR-005 | Hash routing + base de Vite | Recarga segura en Pages; URL con `#` aceptada |
| ADR-006 | Tres formatos: dataset, modelo y experimento | Inferencia y reanudación no se confunden; más contratos que validar |
| ADR-007 | Documentación antes de aplicación | Esta revisión no contiene UI funcional ni pruebas de producto ejecutadas |
| ADR-008 | Un solo estado matemático para 2D y 3D | Vistas equivalentes y accesibles; no ejecutar motores separados por vista |

Estado de todos los ADR: **propuestos para revisión**. Si se modifica alguno, conservar motivo, alternativa y efecto en requisitos/pruebas. [Fuentes oficiales](18-fuentes.md).
