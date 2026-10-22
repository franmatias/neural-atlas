# Riesgos, decisiones y revisión

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación y evidencia |
|---|---|---|
| Alcance didáctico amplio | Producto superficial o incompleto | Vertical inicial L02, motor común y matriz de conceptos/historias; D3 cierra catálogo |
| Explicación distinta del cálculo | Confusión o error docente | Fórmulas/valores proceden de snapshot; fixtures y revisión editorial |
| Fuga entre conjuntos | Evaluación optimista | IDs/grupos disjuntos, fit train, CV por fold; test reservado |
| Entrenamiento bloquea UI | Controles inutilizables | Worker, trozos acotados y cancelación medidos |
| Checkpoint parcial | Reanudación diferente | Frontera confirmada, RNG/Adam/BN/scheduler completos |
| LocalStorage insuficiente | Pérdida de guardados | Presupuesto 3 MiB, errores recuperables, exportación y escritura única |
| Edición en dos pestañas | Última escritura reemplaza cambios | Detectar revisión/evento storage, conservar copia conflictiva y avisar |
| Demasiadas aristas en red | Visual ilegible | Agrupar neuronas, inspección local y mapa matricial |
| 3D inaccesible o sin GPU | Parte de clase queda excluida | 2D equivalente, tabla y teclado; WebGL opcional |
| Caché de build incompatible | Worker/chunks de versiones distintas | Actualización en espera y control de protocolo/build |
| Importaciones maliciosas | Bloqueo o ejecución de contenido | Límites y esquemas estrictos, texto escapado, sin scripts |
| Curvas con pocas muestras | Interpretación excesiva | Recuentos, seeds y avisos de incertidumbre; no prometer calibración |
| Discrepancias entre navegadores | Tests frágiles | Float64 CPU, tolerancias, renderer estable y revisión GPU separada |
| Dependencias cambian requisitos | Instalación falla | Versiones/lockfile y runtime compatible verificados al iniciar D1 |
| Catálogo crece sin control | Conceptos sueltos sin experiencia | ID estable, ciclo editorial, actividad/evidencia y tests obligatorios |
| Datos didácticos parecen reales | Conclusiones incorrectas | Nombre «sintético», receta/unidades y límites del mecanismo |

## Decisiones de producto propuestas

1. Nombre provisional Neural Atlas; estética nueva y sin reutilizar la interfaz original.
2. 12 laboratorios + 8 talleres; los conceptos no exigen una ruta individual.
3. Catálogo de 140 conceptos iniciales y ampliación por registros declarativos.
4. Dataset máximo 10.000 filas, 32 features transformadas y 10 clases; modelo máximo 30.000 parámetros.
5. Entrenamiento CPU Float64 en Worker; GPU solo para visualización.
6. BN/dropout/schedulers sí están incluidos y requieren implementación matemática real, no una casilla decorativa.
7. Modelo nativo para inferencia, experimento/checkpoint completo para reanudar; no prometer compatibilidad con frameworks externos.
8. LocalStorage para preferencias/progreso/compactos; archivos para intercambios grandes y respaldo.
9. GitHub Pages con hash routing y PWA después de guardar sesión; remoto y publicación se configuran en implementación.
10. Los commits se realizan por incrementos reales, con ramas y fusiones; sin actividad automática en segundo plano cuando el agente no está trabajando.

Estas decisiones están suficientemente concretadas para revisar. El usuario puede corregir cualquiera antes de D1. La petición de revisar la especificación es la razón para cerrar esta entrega sin empezar a implementar Vue.

## Criterios de revisión de la especificación

Comprobar si la secuencia educativa encaja con FP/universidad, si los talleres incluyen los casos prioritarios, si la densidad visual resulta adecuada y si los límites iniciales bastan. Revisar especialmente la distinción modelo/experimento, el bloqueo de test, el alcance de CNN y el catálogo abierto. No hay una decisión técnica bloqueante pendiente que requiera detener la documentación.

## Registro de cambios

| Versión | Fecha | Cambio |
|---|---|---|
| 0.1 | 22/10/2026 | Especificación inicial basada en auditoría local y acuerdos del usuario |
| 0.1 | 22/10/2026 | Ampliación solicitada: 40 conceptos adicionales y registro abierto sin máximo fijo |

La especificación no equivale a validar en aula el producto. Los objetivos cuantitativos se medirán cuando exista la implementación; ver [plan de aceptación](13-pruebas-y-aceptacion.md).
