# Especificación para revisión · Neural Atlas 0.1

Fecha: 22/10/2026. Estado: **propuesta documentada; aplicación pendiente de implementación**. Público: FP de especialización y universidad. Proyecto: `simulator-neural-networks`, independiente del simulador original.

## Resumen revisable

12 laboratorios, ocho talleres, 140 conceptos iniciales en un catálogo abierto, 68 requisitos funcionales, 24 no funcionales, 44 historias y 20 diagramas de diseño Mermaid. Vue con Composition API/TS, Tailwind y Vite; motor CPU en Worker, gráficas D3/SVG/Canvas y vistas Three.js equivalentes a 2D. LocalStorage acotado, exportación/importación nativa y preparación para PWA/GitHub Pages.

La lista original se conserva y amplía con 40 conceptos sobre datos, validación, calibración, métricas, estabilidad y reproducibilidad. Es abierta: C141 y siguientes se añaden mediante registros versionados con experiencias y pruebas, sin renumerar ni imponer un enum cerrado.

## Orden sugerido de revisión

1. [Visión y alcance](02-vision-y-alcance.md): acuerdos, límites y entregas.
2. [Laboratorios](05-laboratorios.md): preguntas, controles, ejemplos y actividades.
3. [Diseño de interfaz](07-diseno-de-interfaz.md): identidad, medidas, estados y ajustes.
4. [Diagramas](15-diagramas.md): clases, secuencias, estados y vistas arquitectónicas.
5. [Historias y Git](14-historias-y-plan-git.md): orden de implementación y criterios para integrar.

## Diseño visual de referencia

Son wireframes de especificación con cifras ilustrativas, no capturas del simulador funcionando.

![Escritorio claro](design/desktop-light.svg)

[Escritorio oscuro](design/desktop-dark.svg) · [Vista móvil](design/mobile.svg)

## Índice completo

| Documento | Contenido |
|---|---|
| [01 · Auditoría](01-auditoria.md) | Evidencias del original y correcciones necesarias |
| [02 · Visión](02-vision-y-alcance.md) | Público, alcance, límites y fases |
| [03 · Requisitos funcionales](03-requisitos-funcionales.md) | RF-001–RF-068 con aceptación observable |
| [04 · Requisitos no funcionales](04-requisitos-no-funcionales.md) | RNF-001–RNF-024 medibles |
| [05 · Laboratorios](05-laboratorios.md) | L01–L12 y ocho talleres |
| [06 · Catálogo abierto](06-matriz-conceptos.md) | C001–C140, ampliación y evidencias |
| [07 · Interfaz](07-diseno-de-interfaz.md) | Tokens, responsive, navegación y componentes |
| [08 · Taller y contenidos](08-taller-y-contenidos.md) | Secuencias docentes, rúbricas y datos sintéticos |
| [09 · Arquitectura](09-arquitectura.md) | Carpetas propuestas, responsabilidades, puertos y ADR |
| [10 · Motor](10-motor-matematico.md) | Fórmulas, convenciones, optimizadores y métricas |
| [11 · Contratos](11-datos-y-protocolo-worker.md) | Entidades, archivos, hashes y mensajería |
| [12 · Persistencia/offline](12-persistencia-offline-y-seguridad.md) | Cuotas, recuperación, PWA, Pages y seguridad |
| [13 · Pruebas](13-pruebas-y-aceptacion.md) | Unidad, integración, E2E, cobertura y calidad |
| [14 · Historias](14-historias-y-plan-git.md) | 44 historias, ramas y plan incremental |
| [15 · Diagramas](15-diagramas.md) | 20 diagramas y sus fuentes editables |
| [16 · Riesgos](16-riesgos-y-decisiones.md) | Decisiones propuestas y revisión |
| [17 · Desarrollo](17-guia-de-desarrollo.md) | Cómo comprobar y mantener esta fase |
| [18 · Fuentes](18-fuentes.md) | Referencias oficiales consultadas |
| [19 · Verificación](19-verificacion.md) | Comprobaciones realmente ejecutadas y límites |

## Qué revisar antes de D1

Nombre/identidad, secuencia didáctica, casos prioritarios, alcance de CNN, límites de datos/modelos y formato de intercambio. Los valores de rendimiento/cobertura son objetivos; su cumplimiento se medirá con la aplicación implementada. Los controles documentales no sustituyen a esas pruebas.
