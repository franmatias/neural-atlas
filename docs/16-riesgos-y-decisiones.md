# Riesgos, decisiones y revisión

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación y evidencia |
|---|---|---|
| Alcance didáctico amplio | Producto superficial o incompleto | MVP D1–D5; ampliación D6–D10; seis extensiones 1.2 fuera de la puerta inicial; esfuerzo y dependencias por fase |
| Explicación distinta del cálculo | Confusión o error docente | Fórmulas/valores proceden de snapshot; fixtures y revisión editorial |
| Fuga entre conjuntos | Evaluación optimista | IDs/grupos disjuntos, fit train, CV por fold; test reservado |
| Entrenamiento bloquea UI | Controles inutilizables | Worker, trozos acotados y cancelación medidos |
| Checkpoint parcial | Reanudación diferente | Frontera confirmada, RNG/Adam/BN/scheduler completos |
| Cuota o IDB denegado | Pérdida de guardados | Presupuesto IDB 256 MiB objetivo, operaciones asíncronas, rollback y exportación; LocalStorage solo ajustes/progreso |
| Edición en dos pestañas | Sobrescribir revisión ajena | Comprobar revision dentro de transacción IDB; segunda escritora recibe conflicto |
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
2. 12 laboratorios + 12 talleres por entregas; MVP incluye T01–T05, sin ruta individual por concepto.
3. Catálogo de 152 conceptos iniciales, con entrega/estado y ampliación por registros declarativos.
4. Dataset máximo 10.000 filas, 32 features transformadas y 10 clases; 0–6 capas de hasta 64, máximo derivado 23.562 densos/24.330 con BN.
5. Entrenamiento CPU Float64 en Worker; GPU solo para visualización.
6. BN/dropout/schedulers sí están incluidos y requieren implementación matemática real, no una casilla decorativa.
7. Modelo nativo para inferencia, experimento/checkpoint completo para reanudar; no prometer compatibilidad con frameworks externos.
8. IndexedDB para biblioteca/datos/checkpoints, LocalStorage para preferencias/progreso; JSON columnar y archivos de respaldo.
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
| 0.2 | 22/10/2026 | Revisión técnica: fixtures, IDB, Worker/BN/adaptación, límites y reproducibilidad; MVP e historias por dependencias |
| 0.2 | 22/10/2026 | Segunda revisión: POE, diagnóstico y mapas en MVP; 20 RF/21 historias/12 conceptos nuevos, extensiones acotadas |

La especificación no equivale a validar en aula el producto. Los objetivos cuantitativos se medirán cuando exista la implementación; ver [plan de aceptación](13-pruebas-y-aceptacion.md).
