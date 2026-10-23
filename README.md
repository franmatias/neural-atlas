# Neural Atlas

Laboratorio visual de aprendizaje automático para FP de especialización y universidad. Vue 3 Composition API, TypeScript, Tailwind, Pinia, Vue Router y D3.

**Versión 0.6.0 · ocho laboratorios D1–D4.** Experimenta con datos, una neurona, arquitectura/XOR, activaciones y propagación. Constructor MLP, perceptrón en Worker, mapas reales, softmax/Jacobiano y una actualización de pesos comprobable numéricamente. Añade entrenamiento en Worker con SGD/Momentum/RMSprop/Adam, calendarios, pasos por lote/época, pausa/cancelación y recuperación automática; evaluación de clasificación/regresión y predicción de nuevas muestras. Conserva generadores, fallos, split/pipeline sin fuga e intercambio CSV/JSON. Temas claro/oscuro, responsive, ajustes y animaciones regulables.

![Entrenamiento y curvas reales](docs/implementation/d4-training.png)

## Arrancar

Node **24.19.0**; versión indicada también en `.nvmrc`.

```powershell
npm ci --ignore-scripts
npm run dev
```

Abre [Neural Atlas local](http://127.0.0.1:5173/neural-atlas/). Para producción: `npm run build` y `npm run preview` (puerto 4173).

## Verificar

```powershell
npm run check
npx playwright install chromium firefox webkit
npm run test:e2e
```

Tipos, lint, unidades/integración, cobertura con umbrales, build, presupuesto y documentación. Playwright comprueba recorridos, accesibilidad automática, teclado, persistencia, temas, responsive y CSP sobre producción. Informes: `coverage/` y `playwright-report/`.

La [entrega D4](docs/29-implementacion-d4.md) describe entrenamiento, evaluación, recuperación, presupuesto y límites. CI exige 25 recorridos por motor, incluidos Workers nativos, pérdida de conexión y P-Max.

La [entrega D3](docs/26-implementacion-d3.md) documenta uso, arquitectura, contratos y límites: 184 pruebas unitarias/integración y 98,74% de cobertura de líneas. En D3 se verificaron 18 recorridos por motor; CI exige Chromium, Firefox y WebKit en Linux. [D1](docs/23-implementacion-d1.md) y [D2](docs/25-implementacion-d2.md) conservan su evidencia histórica, incluida la incidencia local de Firefox en Windows.

## Alcance y continuidad

Los datos, modelos y trazas son locales y viven en memoria; LocalStorage guarda preferencias. El entrenamiento general CPU y su evaluación básica están disponibles. Taller, biblioteca, regularización avanzada y 3D mantienen sus fases. El [diseño completo](docs/README.md) conserva **88 requisitos funcionales, 24 no funcionales, 65 historias, 12 laboratorios, 12 talleres y 652 conceptos ampliables**. Hay **569 fichas publicadas: 69 desarrolladas y 500 nuevas de consulta**, con búsqueda bilingüe, filtros por 20 temas nuevos, [paginación numerada y tamaños ajustables](docs/28-paginador-glosario.md), y enlaces estables. Los 83 conceptos originales pendientes conservan sus IDs. La [ampliación editorial](docs/27-ampliacion-conceptos.md) documenta cada ficha y cómo seguir ampliando el catálogo. Hay 30 diagramas Mermaid, incluidos cuatro sobre las implementaciones D3/D4.

El proyecto original permanece en la carpeta hermana `simulador-redes-neuronales`. Repositorio independiente, commits por incremento y fusiones explícitas. [Código en GitHub](https://github.com/franmatias/neural-atlas) · [Aplicación en GitHub Pages](https://franmatias.github.io/neural-atlas/).

El [plan de despliegue continuo](docs/24-despliegue-pages.md) publica `main` después de superar todos los controles de CI y verifica la aplicación HTTPS. Los cambios en desarrollo permanecen en sus ramas hasta estar listos.
