# Guía de desarrollo y mantenimiento

## Fase actual

Este repositorio contiene documentación, fuentes Mermaid y scripts de comprobación documental. No tiene servidor Vue, build de aplicación ni pruebas de producto ejecutables todavía. No ejecutar comandos de implementación futura como si existieran.

Para verificar esta fase, desde la raíz del proyecto:

```powershell
npm ci
npm run docs:check
```

El chequeo valida sintaxis Mermaid, enlaces locales, IDs/referencias y trazabilidad, catálogo de diagramas sincronizado, XML de wireframes y contraste básico de tokens. No certifica aspecto de la futura UI ni accesibilidad completa.

Para regenerar las referencias visuales y el documento con diagramas:

```powershell
npm run docs:wireframes
npm run docs:diagrams
npm run docs:check
```

Los SVG se generan localmente y son wireframes estáticos con cifras ilustrativas. Los `.mmd` son la fuente de verdad de cada diagrama; `15-diagramas.md` se genera a partir de ellos. Las explicaciones y limitaciones se conservan en el script del catálogo.

## Inicio de D1 tras revisión

1. Elegir Node LTS compatible con Vite/Vitest/Tailwind y registrar engines/versiones exactas.
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
- Sin recursos remotos en tiempo de ejecución. Evitar dependencias redundantes; incorporar PixiJS solo con benchmark y ADR.
- Tests orientados a conducta y oráculos externos; no extraer texto del código para probarlo.
- Commits breves por cambios coherentes, sin secretos ni datos personales importados. El original queda fuera del repositorio.

## Cambio de concepto o funcionalidad

Concepto nuevo: añadir registro/ID, explicación, relaciones, laboratorio, actividad y prueba. Si solo usa widgets existentes no requiere cambiar router/motor. Si incorpora una capacidad nueva: ampliar RF/RNF cuando proceda → historia → ADR/diagrama → implementación → pruebas → revisión editorial. Estado `reviewed` solo después de verificación humana.

Cambio de esquema: documentar nueva versión, migración y round-trip de ejemplos; mantener lector antiguo cuando se prometa compatibilidad. Cambio matemático que altera resultados requiere engineVersion nueva, actualización de fixtures y advertencia al cargar experimentos anteriores.

## Publicación futura

Preparar remoto y permisos solo cuando exista destino real; no inventar URL de producción. CI valida main antes de publicar dist. La documentación de usuario final incluirá instalación/offline, datasets, modelos, límites, ejemplos y preguntas frecuentes; este documento es una guía del proceso de construcción.
