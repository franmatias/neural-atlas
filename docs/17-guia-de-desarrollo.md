# Guía de desarrollo y mantenimiento

## Fase actual

Este repositorio contiene documentación, fuentes Mermaid y scripts de comprobación documental. No tiene servidor Vue, build de aplicación ni pruebas de producto ejecutables todavía. No ejecutar comandos de implementación futura como si existieran.

Usar **Node 24 LTS** (referencia local 24.19.0 en `.node-version`), sin depender del Node 20 observado en auditoría. Para verificar esta fase, desde la raíz:

```powershell
npm ci
npm run docs:check
```

El chequeo valida Mermaid, enlaces, IDs, RF→módulo→historia→prueba, fases, catálogos sincronizados, plantilla editorial de ejemplo, XML, contraste de texto y no textual, y oráculos numéricos/RNG. No certifica UI ni accesibilidad completa.

Para regenerar las referencias visuales y el documento con diagramas:

```powershell
npm run docs:wireframes
npm run docs:diagrams
npm run docs:trace
npm run docs:check
```

Los SVG se generan localmente y son wireframes estáticos con cifras ilustrativas. Los `.mmd` son la fuente de verdad de cada diagrama; `15-diagramas.md` se genera a partir de ellos. Las explicaciones y limitaciones se conservan en el script del catálogo.

El script opcional `scripts/visual-review.mjs` requiere Playwright/Chrome y puede localizar módulo mediante `NEURAL_ATLAS_PLAYWRIGHT`. Renderiza los 26 diagramas, guarda SVG en `docs/diagrams/rendered` y actualiza PNG base. No es la batería E2E del producto. Las herramientas documentales fijan KaTeX mediante override verificado para estos diagramas; ver [registro](19-verificacion.md).

## Inicio de D1 tras revisión

1. Verificar Node 24 LTS con Vite/Vitest/Tailwind y fijar versiones exactas, sin volver a Node 20.
2. Crear rama `feat/vue-foundation`, añadir estructura mínima y lockfile de aplicación, conservando las herramientas documentales.
3. Configurar TS estricto, Vue typecheck, lint de fronteras/ciclos, formatter, alias y router hash.
4. Crear scripts de unidad, integración, cobertura y build con CI; no añadir E2E ficticios antes de tener recorrido real.
5. Primer incremento vertical: AppShell, ajustes, L02, cálculo puro y controles accesibles con pruebas.
6. Integrar tras controles correctos y actualizar estados de historias/RF/conceptos realmente terminados.

## Convenciones

- Archivos Vue en PascalCase; módulos TS en kebab-case; composables `useNombre`; interfaces de puertos por capacidad.
- Funciones del dominio reciben dependencias explícitas. No importa Vue, window, document, Worker o LocalStorage el dominio.
- No usar `any` para silenciar errores; `unknown` en frontera y validación posterior. Estados y mensajes como uniones discriminadas exhaustivas.
- No duplicar fórmulas en vistas. Un inspector consume los valores intermedios del mismo cálculo que genera predicciones.
- Todo listener, observer, renderer y Worker tiene liberación explícita. No se disparan dos bucles de entrenamiento por doble clic.
- Cuota/transacciones IDB se prueban en D5; copia automática RAM y planificación BN se diseñan desde el Worker, no se añaden al final como fallback ficticio.
- Sin recursos remotos en tiempo de ejecución. Evitar dependencias redundantes; incorporar PixiJS solo con benchmark y ADR.
- Tests orientados a conducta y oráculos externos; no extraer texto del código para probarlo.
- Commits breves por cambios coherentes, sin secretos ni datos personales importados. El original queda fuera del repositorio.

## Cambio de concepto o funcionalidad

Concepto nuevo: añadir registro/ID, explicación, relaciones, laboratorio, actividad y prueba. Si solo usa widgets existentes no requiere cambiar router/motor. Si incorpora una capacidad nueva: ampliar RF/RNF cuando proceda → historia → ADR/diagrama → implementación → pruebas → revisión editorial. Estado `reviewed` solo después de verificación humana.

Cambio de esquema: documentar nueva versión, migración y round-trip de ejemplos; mantener lector antiguo cuando se prometa compatibilidad. Cambio matemático que altera resultados requiere engineVersion nueva, actualización de fixtures y advertencia al cargar experimentos anteriores.

## Publicación futura

El usuario ha indicado `https://github.com/franmatias/neural-atlas.git` para subir proyecto/historial documental; hacerlo sin force-push y comprobar SHA remoto. La aplicación Pages se prepara posteriormente bajo `/neural-atlas/`, con CI antes de publicar dist. La guía de usuario final incluirá instalación/offline, datasets/modelos, límites y ejemplos; no se presenta el repositorio de documentos como simulador ya operativo.
