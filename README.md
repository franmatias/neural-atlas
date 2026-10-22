# Neural Atlas — simulator-neural-networks

Laboratorio didáctico de redes neuronales para FP de especialización y universidad.

**Estado: especificación 0.1 para revisión. La aplicación todavía no está implementada.**

Este repositorio se inicia con el análisis y el diseño; el desarrollo funcional comienza tras revisar la especificación. El simulador original se conserva en la carpeta hermana `simulador-redes-neuronales`.

## Lectura

La entrada principal es [la especificación](docs/README.md), con 68 requisitos funcionales, 24 no funcionales, 12 laboratorios, ocho talleres, 140 conceptos iniciales ampliables, 44 historias y 20 diagramas Mermaid editables.

Revisa primero [alcance](docs/02-vision-y-alcance.md), [laboratorios](docs/05-laboratorios.md) y [diseño visual](docs/07-diseno-de-interfaz.md). Los temas [claro](docs/design/desktop-light.svg), [oscuro](docs/design/desktop-dark.svg) y [móvil](docs/design/mobile.svg) son referencias estáticas del diseño.

## Comprobar esta entrega

```powershell
npm ci
npm run docs:check
```

Estos comandos comprueban documentación; todavía no hay aplicación Vue ni pruebas de producto. Consulta [la verificación](docs/19-verificacion.md) y [el plan de pruebas](docs/13-pruebas-y-aceptacion.md). Las dependencias actuales sirven exclusivamente para validar Mermaid y los documentos; el stack de aplicación se incorporará tras revisar la especificación.

## Historial

Repositorio independiente con rama principal `main`. Cada bloque documental se desarrolla en una rama y se integra con un commit de fusión. Los futuros incrementos funcionales seguirán el mismo criterio.

Fecha de inicio: 22 de octubre de 2026. Nombre de producto provisional: **Neural Atlas**.
