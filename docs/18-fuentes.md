# Fuentes y fundamentos

Consulta: 22/10/2026. Referencias primarias/oficiales; las decisiones de alcance y los límites son propuestas del proyecto, no recomendaciones atribuidas a estas fuentes. No se han fijado aquí versiones futuras de paquetes a partir de snippets de búsqueda.

| Fuente | Uso en el diseño |
|---|---|
| [Vue: TypeScript con Composition API](https://vuejs.org/guide/typescript/composition-api.html) | Componentes tipados y contratos de UI |
| [Vite: guía y requisitos](https://vite.dev/guide/) | Revisar runtime compatible antes de D1 |
| [Vite: despliegue estático](https://vite.dev/guide/static-deploy.html) | Base de assets y build para GitHub Pages |
| [Vue Router: modos de historial](https://router.vuejs.org/guide/essentials/history-mode.html) | Hash routing para hosting sin reescritura |
| [Tailwind: integración con Vite](https://tailwindcss.com/docs/installation/using-vite) | Compilación local de estilos |
| [D3: getting started](https://d3js.org/getting-started) | Módulos de visualización y escalas |
| [Three.js: manual de recursos y limpieza](https://threejs.org/manual/#en/cleanup) | Gestión de ciclo de vida de geometría, materiales y texturas |
| [MDN: uso de Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) | Contexto aislado, mensajería y responsabilidades |
| [MDN: cuotas y retirada de almacenamiento](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) | No asumir almacenamiento ilimitado o perpetuo |
| [MDN: Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers) | Cache, instalación y contexto seguro |
| [Vitest: coverage](https://vitest.dev/guide/coverage.html) | Cobertura y proveedor V8 |
| [Playwright: webServer](https://playwright.dev/docs/test-webserver) | Levantar servidor de producción para pruebas |
| [scikit-learn: errores habituales](https://scikit-learn.org/stable/common_pitfalls.html) | Separación de fit/transform y fuga de datos |
| [scikit-learn: validación cruzada](https://scikit-learn.org/stable/modules/cross_validation.html) | Separación de selección/evaluación y estrategias de partición |
| [scikit-learn: métricas](https://scikit-learn.org/stable/modules/model_evaluation.html) | Referencia de definiciones y casos degenerados |
| [Kingma y Ba: Adam](https://arxiv.org/abs/1412.6980) | Momentos y corrección de sesgo |
| [Ioffe y Szegedy: Batch Normalization](https://arxiv.org/abs/1502.03167) | Normalización con estadísticas de lote y estado de inferencia |

Las convenciones concretas (orientación de matrices, EMA de BN, regularización acoplada, métricas no definidas y formato de exportación) se fijan en [el motor](10-motor-matematico.md). La referencia a scikit-learn no implica añadir Python al producto ni prometer resultados idénticos a todos sus estimadores. Tampoco se afirma que BN tenga una explicación causal única ni que un optimizador garantice convergencia en toda red.

Fuentes adicionales para contenidos nuevos se registrarán por concepto en el catálogo abierto. No copiar pasajes extensos de documentación o papers; redactar explicaciones originales con fórmulas y ejemplos verificables.
