# Neural Atlas — simulator-neural-networks

Laboratorio didáctico de redes neuronales para FP de especialización y universidad.

**Estado: especificación 0.2 para revisión. La aplicación todavía no está implementada.**

Este repositorio se inicia con el análisis y el diseño; el desarrollo funcional comienza tras revisar la especificación. El simulador original se conserva en la carpeta hermana `simulador-redes-neuronales`.

## Lectura

La entrada principal es [la especificación](docs/README.md): **88 requisitos funcionales, 24 no funcionales, 12 laboratorios, 12 talleres previstos, 152 conceptos ampliables, 65 historias y 26 diagramas Mermaid**. [Cambios de revisión](docs/20-revision-y-respuestas.md) y [trazabilidad RF→módulo→historia→prueba](docs/21-trazabilidad-rf.md).

MVP: predice-observa-explica, diagnóstico con métricas reales, mapas de activación, núcleo de datos/MLP y talleres T01–T05. La planificación conserva el alcance completo en v1.1 y separa extensiones v1.2 propuestas. IndexedDB almacena biblioteca/checkpoints; LocalStorage, preferencias/progreso.

Revisa primero [alcance](docs/02-vision-y-alcance.md), [laboratorios](docs/05-laboratorios.md) y [diseño visual](docs/07-diseno-de-interfaz.md). Los temas [claro](docs/design/desktop-light.svg), [oscuro](docs/design/desktop-dark.svg) y [móvil](docs/design/mobile.svg) son referencias estáticas del diseño.

## Comprobar esta entrega

Usar **Node 24 LTS** (referencia 24.19.0); no cambiar automáticamente el Node global del equipo.

```powershell
npm ci
npm run docs:check
```

Estos comandos comprueban documentación; todavía no hay aplicación Vue ni pruebas de producto. Consulta [la verificación](docs/19-verificacion.md) y [el plan de pruebas](docs/13-pruebas-y-aceptacion.md). Las dependencias actuales sirven exclusivamente para validar Mermaid y los documentos; el stack de aplicación se incorporará tras revisar la especificación.

## Historial

Repositorio independiente con rama principal `main`. Cada bloque documental se desarrolla en una rama y se integra con un commit de fusión. Los futuros incrementos funcionales seguirán el mismo criterio.

Fecha de inicio: 22 de octubre de 2026. Nombre de producto provisional: **Neural Atlas**.

Repositorio indicado por el usuario: [franmatias/neural-atlas](https://github.com/franmatias/neural-atlas). El sitio Vue y el despliegue de GitHub Pages se construirán tras revisar la especificación; publicar estos documentos no equivale a tener el simulador desplegado.
