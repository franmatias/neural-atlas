# Paquete de aula 1.5.0-r1 y procedimientos de validación

Fecha: 28/10/2026. Aplicación objetivo: **1.5.0**. Revisión documental y de materiales, sin cambios en el motor ni en la interfaz. Los pasos 2–4 quedan **preparados**; su ejecución con personas y la decisión docente permanecen pendientes.

## Entregables

- [Instrucciones del paquete](classroom/LEEME.md), con orden de uso y distinción entre ZIP de aula y paquetes JSON de Docencia.
- [Paso 2 · piloto](classroom/06-ejecucion-piloto.md): planificación rellenable, ensayo, secuencia de recogida y cierre con responsables.
- [Paso 3 · análisis](classroom/07-analisis-resultados.md): limpieza trazable, corrección, denominadores, datos faltantes, incidencias y plantilla del informe.
- [Paso 4 · aceptación](classroom/08-aceptacion-docente.md): revisión de evidencia C1–C5, decisiones motivadas, condiciones y repetición tras cambios.
- [G00 · acogida](classroom/09-acogida-talleres.md): ejemplo resuelto y recorrido semiguiado en cinco fases, tras el pre. No se suma a A01–A12 ni acredita autonomía o T02 completado.
- [Registro introductorio vacío](classroom/registros/introduccion.csv), además de los cuatro CSV originales, sin modificar sus cabeceras.
- [ZIP 1.5.0](downloads/neural-atlas-aula-v1.5.0.zip) y manifiesto con versión de aplicación, revisión de paquete, estado y hashes SHA-256.

Se sincronizan protocolo, cuaderno, acta, diccionario y página de validación. El recorrido completo pasa a sesiones de 100 y 90 minutos; la alternativa focal dura 100. Se explicita el mínimo de seis unidades realmente observadas por tarea en C2, además de seis asignadas y el umbral de 80 % sobre asignadas. No se elimina del denominador a quien falta ni se trata ayuda desconocida como cero.

El README principal pasa de una sucesión histórica de entregas a explicar funciones, inicio rápido, catorce laboratorios, recursos docentes, almacenamiento, offline y ejecución técnica. Los informes originales siguen conservados en el índice documental.

## Integridad y mantenimiento

El [generador](../scripts/build-classroom-kit.py), escrito con la biblioteca estándar de Python 3, genera el manifiesto y un ZIP con rutas relativas internas. No incorpora archivos de trabajo reales. Rechaza CSV con filas adicionales a la cabecera y exige que la versión objetivo coincida con `package.json` al regenerar. No cambia la versión de la aplicación por una revisión del material.

```powershell
python scripts/build-classroom-kit.py
python scripts/build-classroom-kit.py --check
npm run docs:check
```

La comprobación del ZIP verifica inventario exacto, CRC, contenido de cada entrada, hashes del manifiesto y cinco registros vacíos. La generación usa metadatos fijos: dos ejecuciones con las mismas fuentes y herramienta producen el mismo archivo. El paquete 1.4.0 se conserva sin modificar. Para una nueva aplicación, revisar primero objetivo, `kitVersion` y fecha en el manifiesto, además de los textos afectados; no basta cambiar una etiqueta.

CI ejecuta esta comprobación en un trabajo previo al resto de puertas de calidad: una distribución obsoleta, un manifiesto que no coincide o registros cumplimentados impiden publicar.

El ZIP permite leer Markdown y CSV localmente. No incluye la PWA ni convierte enlaces externos en recursos offline. Las copias cumplimentadas deben conservarse fuera del paquete original y gestionarse según el procedimiento del centro.

## Estado de aceptación

Verificación local de esta revisión: 75 documentos y 470 enlaces locales correctos; 83 diagramas Mermaid en Markdown y 30 fuentes conservadas. El ZIP contiene 17 entradas y cinco CSV de solo cabecera. Dos generaciones consecutivas produjeron el mismo SHA-256. En copias temporales se comprobó que el verificador acepta la distribución correcta y rechaza un CSV cumplimentado, un manifiesto desactualizado y una entrada alterada en el ZIP.

Preparar una planificación, un análisis en blanco y una guía de decisión no ejecuta un piloto ni firma un acta. Siguen pendientes observación con alumnado, revisión con lector y equipos reales, análisis de respuestas recogidas y decisión docente. La [lista de pendientes](59-pendientes-y-revision-teclado.md) conserva esa distinción.
