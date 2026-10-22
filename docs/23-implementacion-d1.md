# Implementación D1 · Neural Atlas 0.3

Nota posterior: la primera publicación HTTPS se realiza mediante [GitHub Pages y CI](24-despliegue-pages.md), solicitada después de entregar D1. Los resultados de esta entrega se conservan como registro histórico.

Fecha: 22/10/2026. Primera entrega funcional de la especificación 0.2. La aplicación usa Vue 3 con Composition API, TypeScript estricto, Vite, Pinia, Vue Router, Tailwind 4 y D3. El proyecto original permanece intacto.

## Qué se puede usar

- Inicio, catálogo, rutas directas y página de dirección desconocida bajo `/neural-atlas/` con navegación hash.
- L02: neurona de dos entradas, pesos y sesgo manuales; cinco ejemplos y seis activaciones: sigmoide, tanh, ReLU, Leaky ReLU con α=0,01, lineal y escalón.
- Diagrama de señal, contribuciones numéricas, suma, salida y derivada. Tres niveles de explicación compartidos con el glosario.
- Plano de entradas con ratón o flechas. Sombreado de semiplanos, frontera recortada, caso constante, tangencia a una esquina y frontera fuera del encuadre. El sesgo desplaza la frontera manteniendo la orientación.
- Curva de activación construida con D3. El eje se amplía cuando el valor actual sale del intervalo inicial; el escalón conserva la discontinuidad.
- Reproductor de cinco fases, pasos manuales y velocidad 0,25–4×. Cambia únicamente la animación. Se detiene al cambiar parámetros, ocultar la página, salir de la ruta o activar movimiento reducido.
- Tema claro/oscuro/sistema, modo presentación, preferencia de movimiento, nivel y velocidad. Panel modal y página de ajustes; preferencias versionadas en LocalStorage con debounce de 500 ms y alternativa en memoria.
- Quince conceptos publicados, buscables por español/inglés y sin distinguir tildes. El catálogo de diseño sigue abierto con 152 conceptos previstos; importar contenidos llegará en D10.

La sesión de la neurona se mantiene al navegar, pero se reinicia al recargar. D1 **no entrena**, guarda modelos ni importa datasets. Worker, MLP, intercambio de archivos, IndexedDB, taller POE, Three.js y PWA conservan sus fases de diseño. No se incluyen botones que simulen esas operaciones.

Capturas reales: [escritorio claro](implementation/d1-light.png), [escritorio oscuro](implementation/d1-dark.png) y [móvil oscuro](implementation/d1-mobile.png).

## Guía de uso

1. Abre «Explorar una neurona». El ejemplo inicial produce `z = 0,44` y `a ≈ 0,6082590307465143`.
2. Cambia una entrada con el deslizador o escribe con coma/punto y confirma con Intro o al salir del campo. Un texto incompleto o inválido no modifica el cálculo; el error explica cómo corregirlo.
3. Recorre las fases: entradas → productos → suma y sesgo → activación → salida. La animación no representa aprendizaje.
4. Selecciona «Paso a paso» para ver las contribuciones; «Formal» añade la derivada y las convenciones.
5. Cambia solo el sesgo y observa la frontera. Prueba después el ejemplo sin pesos influyentes y el de ReLU.
6. En móvil alterna «Explorar», «Tu experimento» y «Explicación». Las pestañas admiten flechas, Inicio y Fin. El reproductor permanece accesible durante el desplazamiento.

Solo la salida sigmoide se interpreta aquí como probabilidad binaria. Estar entre cero y uno no demuestra calibración. ReLU usa derivada cero en cero; el escalón devuelve derivada no disponible para backprop.

## Responsabilidades implementadas

| Carpeta | Responsabilidad |
|---|---|
| `src/app` | Arranque, rutas, shell y traducciones con fallback explícito al español |
| `src/domain/network` | Funciones puras: neurona, activaciones, derivadas y geometría afín |
| `src/application/playback` | Máquina temporal pura, independiente de Vue y del cálculo |
| `src/stores` | Sesión de neurona y preferencias compartidas con Pinia |
| `src/infrastructure/persistence` | Lectura/escritura y validación de preferencias versionadas |
| `src/features` | Páginas y componentes específicos de cada experiencia |
| `src/shared` | Campos decimales, formatos, iconos propios, ajustes y control de foco |
| `src/content` | Registros editoriales de laboratorios, conceptos y presets |
| `src/assets/styles` | Tokens/base, shell/páginas, laboratorio y adaptación/accesibilidad |
| `tests/unit`, `tests/integration`, `tests/e2e` | Matemáticas, coordinación de UI y navegador real |

El dominio no depende de Vue, Pinia, DOM, almacenamiento ni aleatoriedad del sistema; ESLint impide esas dependencias. Los gráficos convierten resultados del dominio a SVG mediante escalas/trazados D3, sin volver a calcular la neurona dentro de un gráfico. Las páginas se cargan por ruta; D3 se descarga al abrir L02. No hay red de entrenamiento ni servidor de datos.

Los identificadores editoriales se mantienen estables. Para añadir un concepto publicado se incorpora un registro completo en `src/content/concepts.ts`, se relaciona con una experiencia realmente disponible y se prueba su búsqueda; no basta con añadir un título de un tema futuro. `src/app/i18n` define es/en/ca/gl/eu; solo español está publicado. Las etiquetas de interfaz usan claves; el contenido editorial se conserva separado del motor.

## Reproducción local

Usa Node **24.19.0**; `.nvmrc` y `engines` lo documentan. No hace falta modificar el Node global si se utiliza un gestor de versiones o un ejecutable local.

```powershell
npm ci --ignore-scripts
npm run dev
```

Vite sirve la aplicación en `http://127.0.0.1:5173/neural-atlas/`. Para verificar la salida de producción:

```powershell
npm run build
npm run preview
```

La vista previa usa `http://127.0.0.1:4173/neural-atlas/`. No abrir `dist/index.html` mediante `file://`: los módulos requieren un servidor HTTP.

## Batería y trazabilidad

```powershell
npm run check
npx playwright install chromium firefox webkit
npm run test:e2e
```

`check` exige tipos, lint, Vitest con cobertura, build, presupuesto inicial y documentación. `test:e2e` reconstruye y Playwright levanta una vista previa si no hay una disponible. Para repetir una familia: `npm run test:e2e -- --project=chromium`.

| Historia / prueba del diseño | Evidencia D1 |
|---|---|
| US-001 / P-E01, P-E16 | Rutas, sesión entre páginas, subcarpeta, salto al contenido y foco |
| US-002 / P-I10a, P-E01 | Búsqueda de los 15 registros reales, inglés/tildes y tres niveles |
| US-003 / P-E15, P-V01 | Preferencias, diálogo, tema, tamaños, zoom de texto, capturas y axe |
| US-004 / P-L02, P-E04a | Máquina temporal, lifecycle, velocidad, pausa y resultado invariable |
| US-005 / P-E01, P-E15 | Presets y plano accesible con teclado/ratón |
| US-013 / P-L02 | Fixture de neurona, activaciones y diferencias finitas de sus derivadas |
| US-065 / P-Q20 | Claves de traducción y fallback; formatos y parser locales fuera del dominio |

Los requisitos de estas historias están implementados para D1. La aceptación integral incluye las limitaciones de verificación indicadas a continuación. Los identificadores P-* de fases posteriores siguen siendo un plan y no se presentan como pruebas ejecutadas.

El informe HTML de cobertura se genera en `coverage/index.html`; Playwright produce `playwright-report/index.html`, capturas y trazas de los fallos en `test-results/`. Se instrumenta todo `src` TS/Vue, excepto arranque/rutas, tipos y registros declarativos. No se excluyen motor, parser, validadores ni controladores de errores. Los umbrales de dominio son 95% líneas/instrucciones/funciones y 90% ramas; aplicación/infraestructura 90/85; total 85/80. Las capturas actuales documentan la revisión visual; todavía no constituyen una línea base portable de regresión píxel a píxel.

## Resultados y límites

Ejecución local final en Windows, Node 24.19.0, 22/10/2026:

| Comprobación | Resultado |
|---|---|
| TypeScript y ESLint | Correctos |
| Vitest | 61 pruebas correctas en 5 archivos |
| Cobertura total V8 | 98,93% líneas; 99,02% instrucciones; 97,12% funciones; 96,20% ramas |
| Dominio matemático y geometría | 100% líneas/instrucciones/funciones/ramas |
| Playwright Chromium | 10 recorridos correctos |
| Playwright WebKit | 10 recorridos correctos |
| Playwright Firefox | No ejecutables localmente por la incidencia de arranque descrita abajo |
| CI Ubuntu 24.04 | Instalación limpia, `check`, matriz Chromium/Firefox/WebKit e informes: aprobados en [ejecución 39854702324](https://github.com/franmatias/neural-atlas/actions/runs/39854702324), commit `85e4add` |
| Transferencia inicial gzip | JS 48,79 KiB; CSS 7,41 KiB; dentro de límites 250/60 KiB |
| Documentación | 26 Mermaid válidos/sincronizados y 160 enlaces locales correctos |

El presupuesto se comprueba sobre imports iniciales más la ruta de inicio y su script de tema; las rutas diferidas no se suman como carga inicial. Los resultados de CI posteriores se distinguen de esta medición local.

La revisión de navegador cubre ambas apariencias con axe (WCAG 2 A/AA y 2.1 AA), anchos 360/390/768/1024/1440, texto ampliado, teclado, persistencia, almacenamiento denegado, movimiento reducido y CSP. Son controles automáticos y revisión visual del agente; no certifican accesibilidad integral ni sustituyen una prueba con lector de pantalla o una revisión docente en aula.

**Incidencia del entorno Windows:** el Firefox 157 de Playwright 1.64.1 no arranca por un ensamblado `mozglue` no encontrado. Se comprobó el registro SideBySide y se reinstaló el paquete una vez; el fallo persiste antes de abrir la aplicación. No se modificó Windows ni se sustituyó el navegador por uno no compatible. La misma matriz **ha pasado en Ubuntu mediante CI**, incluido Firefox. Esa evidencia verifica Linux y no convierte el Firefox local de Windows en un resultado aprobado.

La CSP de producción usa scripts y conexiones propios, sin `eval` ni scripts inline. El tema inicial se aplica mediante un archivo externo antes del arranque; el aviso de Vite de que ese script clásico no se empaqueta es esperado: se copia desde `public/` y su funcionamiento se comprueba en E2E. Desarrollo permite WebSocket local para HMR; ese permiso se elimina del HTML productivo. Los estilos permiten inline para atributos reactivos; no hay CDNs ni analítica. Aún no hay Service Worker ni promesa de uso offline.

## Git e integración continua

Tres incrementos de implementación D1: `feat/d1-shell-settings`, `feat/d1-neuron-playback`, `test/d1-accessibility-csp`; `docs/d1-ci-verification` registra después el resultado remoto y las capturas estables, sin cambiar código de la aplicación. Se integran con `--no-ff`, conservando las ramas para revisar. El flujo CI fija Node 24.19.0 y acciones oficiales por SHA; ejecuta `check` y los tres motores de Playwright, publica informes y no despliega GitHub Pages. La aprobación remota registrada corresponde a una ejecución real, no solo a disponer de un workflow.

La siguiente fase D2 incorpora generación reproducible, defectos, división de datos, pipeline sin fuga e importación/exportación CSV/JSON. El entrenamiento en Worker corresponde a D4 según la dependencia con MLP/backprop de D3.
