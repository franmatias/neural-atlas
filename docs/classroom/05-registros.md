# Registros vacíos y análisis

Los cinco CSV de [participantes](registros/participantes.csv), [observaciones](registros/observaciones.csv), [respuestas](registros/respuestas.csv), [incidencias](registros/incidencias.csv) e [introducción](registros/introduccion.csv) contienen solo cabeceras. No incluyen datos de demostración que puedan confundirse con resultados reales. En 1.5.0-r1 se añade el último; las cuatro cabeceras originales se conservan.

Formato: UTF-8, separador coma, una fila por registro; entrecomillar campos con comas o saltos de línea y duplicar las comillas interiores. Se pueden importar con un asistente de texto si la hoja de cálculo del equipo usa punto y coma. No introducir fórmulas de hoja de cálculo en texto libre. Revisar capturas y exportaciones antes de compartirlas.

## Claves y columnas

Claves comunes: `session_id` identifica el piloto/cohorte y se mantiene durante sus dos sesiones de trabajo; `unit_id` identifica la unidad observada, por ejemplo P01. Usar las mismas claves en los registros relacionados. `app_version` recoge la versión real, sin mezclar revisiones en un mismo análisis. Por defecto cada unidad es una persona. En modalidad pareja, un código representa a la pareja y sus respuestas conjuntas; no duplicar filas ni mezclar cuestionarios individuales y conjuntos en el mismo análisis.

### participantes.csv

Una fila por sesión/unidad. `unit_type`: individual o pareja. `prior_experience`: inicial, basica o previa. `questionnaire_order`: A-B o B-A. `prior_solution_access`: si, no o no_consta. `pre_status` y `post_status`: completo, parcial o ausente. `assigned_tasks`: IDs A01–A12 separados con `;`. Sin nombres ni identificadores institucionales.

### observaciones.csv

Una fila por sesión/unidad/tarea/intento. `task_id`: A01–A12; `attempt`: entero desde 1. `result`: completa, parcial, no_completada, ausente o no_asignada. `active_minutes`: número no negativo con punto decimal, vacío si no se midió. `help_max`: 0–3 según el protocolo, vacío si no se observó. `guide_used`: si, no o no_consta. `evidence_ref`: ruta local/código de evidencia revisada. `issue_ids`: IDs separados con `;`. `notes`: observación breve sin datos identificativos.

Para el análisis primario usar el primer intento asignado; conservar los siguientes para seguimiento sin sustituir el resultado original. Una tarea asignada pero no observada no cuenta como éxito. Se puede completar después, registrando nueva fecha/intento y declarando el cambio de evidencia.

### respuestas.csv

Una fila por sesión/unidad/momento/ítem. `moment`: pre o post; `form`: A o B; `item`: 1–8. `response`: texto original. `status`: respondido, no_lo_se, ausente o no_administrado. `points`: 0, 1 o 2 para respuestas evaluables; vacío en ausente/no_administrado. `no_lo_se` equivale a 0 y debe conservar su estado. `correction_notes`: razón de corrección o desacuerdo, sin datos de quien corrige.

No sumar un cuestionario completo si hay ítems ausentes/no administrados. Para cambio pre/post usar únicamente pares de ocho ítems evaluables en ambos momentos y presentar también las ausencias. No extrapolar una suma parcial a 16 puntos.

### incidencias.csv

Una fila por incidencia. `issue_id` único dentro de la sesión; `task_id` o transversal. `severity`: critica, alta, media o baja, según rúbrica. `steps` y `observed` describen reproducción y hecho observado; `expected` explicita la expectativa. `evidence_ref` apunta a material revisado. `state`: abierta, en_revision, corregida_pendiente_retest o cerrada_verificada. `owner_role` indica un rol, no un nombre. `retest_ref` enlaza evidencia real de la repetición.

Cerrar una incidencia exige verificación del comportamiento corregido en versión y dispositivo identificados. Una corrección técnica no demuestra automáticamente comprensión del concepto.

### introduccion.csv

Una fila por sesión/unidad para G00, usando las claves de participantes. `resolved_viewed` y `own_execution`: si, no o no_observado. `guided_status`: completo, parcial, no_iniciado, ausente o no_observado. `help_max`: 0–3 o vacío si no se observó; `active_minutes`: no negativo o vacío. `evidence_ref` enlaza notas o una exportación revisada; `notes` describe las dudas/barreras sin datos identificativos. No deducir finalización, lectura o comprensión a partir de visitar la página o descargar el JSON.

G00 se programa para todas las unidades del piloto; documentar cualquier excepción en la planificación. Mantener ausencias y no observados, y desglosarlos en el informe. Sus filas no son intentos A01–A12, no se añaden a `assigned_tasks` y no entran en los umbrales C2 ni en la puntuación de cuestionarios.

## Cálculos y revisión

1. Revisar claves, duplicados y asignaciones; no convertir celdas vacías en ceros.
2. Por tarea prioritaria: éxitos = primer intento completo con ayuda observada ≤1; denominador = todas las unidades asignadas, incluidas ausencias. Aplicar `éxitos ≥ ceil(0.80 × asignadas)` y mínimo seis asignadas y seis observadas. Informar fracción, porcentaje y n observado. Ayuda vacía no equivale a 0.
3. Por ítem esencial de post: éxitos = respuestas con 2 puntos; denominador = todos los post asignados. Aplicar `éxitos ≥ ceil(0.75 × asignados)` y mínimo seis. No excluir NC para mejorar la tasa.
4. Para pares completos calcular total post menos total pre y mediana de cambios. Conservar cada par; separar orden A-B/B-A y describir conocimientos previos, ayudas y techo. Es un análisis exploratorio, no una prueba causal.
5. Informar por tarea tiempos medidos y número de observaciones. No inventar tiempos para ausentes ni tratarlos como cero. Las medidas de aula no certifican por sí solas un requisito de latencia en milisegundos.
6. Cruzar incidencias, acceso y explicaciones; completar [el acta](04-acta.md). Los umbrales son criterios locales propuestos, no sustituyen la revisión docente ni convierten automáticamente un piloto pequeño en una validación general.
