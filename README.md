# Neural Atlas

Laboratorio visual de aprendizaje automático para FP de especialización y universidad. Vue 3 Composition API, TypeScript, Tailwind, Pinia, Vue Router y D3.

**Versión 0.4 · laboratorios D1 y D2.** Experimenta con una neurona y con datos: ocho generadores reproducibles, fallos controlados, edición, particiones por grupos/tiempo, preparación ajustada solo con train e importación/exportación CSV y JSON. Incluye temas claro/oscuro, modo presentación, ajustes locales, animaciones y glosario en tres niveles.

![Laboratorio de datos](docs/implementation/d2-light.png)

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

La [entrega D2](docs/25-implementacion-d2.md) documenta uso, arquitectura, contratos y límites: 135 pruebas de unidad/integración y 99,21% de cobertura de líneas. Playwright incluye 14 recorridos por motor; CI exige Chromium, Firefox y WebKit en Linux. La [entrega D1](docs/23-implementacion-d1.md) conserva su evidencia histórica y la incidencia local de arranque de Firefox en Windows.

## Alcance y continuidad

La neurona permite modificar parámetros manualmente y el laboratorio de datos prepara conjuntos en un Web Worker. Ambas sesiones se conservan entre rutas; LocalStorage guarda preferencias y los datasets permanecen en memoria hasta exportarlos. Entrenamiento, taller, biblioteca y 3D mantienen sus fases. El [diseño completo](docs/README.md) conserva **88 requisitos funcionales, 24 no funcionales, 65 historias, 12 laboratorios, 12 talleres, 152 conceptos ampliables y 26 diagramas Mermaid**. Treinta y cinco conceptos tienen contenido publicado.

El proyecto original permanece en la carpeta hermana `simulador-redes-neuronales`. Repositorio independiente, commits por incremento y fusiones explícitas. [Código en GitHub](https://github.com/franmatias/neural-atlas) · [Aplicación en GitHub Pages](https://franmatias.github.io/neural-atlas/).

El [plan de despliegue continuo](docs/24-despliegue-pages.md) publica `main` después de superar todos los controles de CI y verifica la aplicación HTTPS. Los cambios en desarrollo permanecen en sus ramas hasta estar listos.
