# Historias de usuario y plan de integración

Historias de producto **planificadas, no implementadas**. Cada fila incluye resultado, RF y pruebas de aceptación. Las condiciones exactas residen en requisitos y laboratorios; evitar duplicarlas con formulaciones divergentes. Prioridad: todas necesarias para la versión completa, ordenadas por dependencia D1–D4.

| Historia | Como usuario quiero… / resultado | RF | Pruebas | Fase |
|---|---|---|---|---|
| US-001 | Volver a una ruta y continuar sin perder contexto | RF-001,RF-004 | P-E01,P-E16 | D1 |
| US-002 | Elegir nivel y buscar términos en español/inglés | RF-002,RF-003 | P-E01,P-I10 | D1 |
| US-003 | Usar tema y ajustes cómodos en cualquier pantalla | RF-005,RF-006 | P-E15,P-V01 | D1 |
| US-004 | Pausar, avanzar fases y regular animación | RF-007,RF-008 | P-E04,P-L05 | D1 |
| US-005 | Proyectar un caso y recuperar su preset | RF-009,RF-010 | P-E01,P-E15 | D1 |
| US-006 | Generar ejemplos idénticos con una semilla | RF-011 | P-L01 | D2 |
| US-007 | Inducir defectos y entender su procedencia | RF-012 | P-L01,P-E02 | D2 |
| US-008 | Importar CSV/JSON con preview y errores útiles | RF-013,RF-019 | P-I01,P-S01 | D2 |
| US-009 | Editar y exportar datos sin perder etiquetas | RF-014,RF-015 | P-E02,P-I08 | D2 |
| US-010 | Separar conjuntos sin mezclar muestras o grupos | RF-016,RF-061 | P-L01 | D2 |
| US-011 | Ajustar transformaciones solo con train | RF-017,RF-018 | P-L01,P-I01 | D2 |
| US-012 | Comparar pipelines e ingeniería de features | RF-020,RF-067 | P-L01,P-L12 | D3 |
| US-013 | Comprender una neurona mediante cálculos reales | RF-021 | P-L02,P-E03 | D1 |
| US-014 | Descubrir el límite lineal con XOR | RF-022 | P-L03,P-E03 | D2 |
| US-015 | Construir una red y contar sus parámetros | RF-023 | P-L03 | D2 |
| US-016 | Comparar inicializaciones con la misma semilla | RF-024 | P-L03 | D2 |
| US-017 | Comparar activaciones y sus derivadas | RF-025 | P-L04 | D2 |
| US-018 | Seguir forward, cadena y actualización única | RF-026,RF-027 | P-L05,P-E04 | D2 |
| US-019 | Distinguir época, iteración y tamaño de lote | RF-028,RF-029 | P-L06 | D2 |
| US-020 | Entrenar y cancelar sin bloquear controles | RF-030,RF-059 | P-I03,P-E05 | D2 |
| US-021 | Elegir optimizador y programar la tasa | RF-031,RF-032 | P-L06,P-L07 | D2 |
| US-022 | Usar pérdidas compatibles y métricas honestas | RF-033,RF-034 | P-L06,P-E06 | D2 |
| US-023 | Ver una trayectoria en 2D y 3D | RF-035 | P-L07,P-E09 | D3 |
| US-024 | Distinguir un paisaje ilustrativo del corte real | RF-036 | P-L07,P-I12 | D3 |
| US-025 | Detectar saturación/explosión y probar clipping | RF-037 | P-L04,P-L08 | D3 |
| US-026 | Observar cómo actúan L1/L2 y dropout/BN | RF-038,RF-039 | P-L08,P-E08 | D3 |
| US-027 | Detener a tiempo y restaurar el mejor modelo | RF-040 | P-I06,P-E08 | D3 |
| US-028 | Aumentar train y comparar capacidad/semillas | RF-041,RF-042 | P-L08,P-L12 | D3 |
| US-029 | Interpretar errores por clase y regresión | RF-043,RF-044 | P-L09,P-L10 | D2 |
| US-030 | Reservar test y reconocer incertidumbre | RF-045,RF-046 | P-E06,P-E07 | D2 |
| US-031 | Seguir una ventana de convolución/pooling | RF-047 | P-L11,P-E10 | D3 |
| US-032 | Comparar dos hipótesis con condiciones explícitas | RF-048 | P-L12,P-E14 | D3 |
| US-033 | Guardar mis experimentos en este navegador | RF-049,RF-058 | P-I07,P-E11 | D2 |
| US-034 | Intercambiar datos, modelos y experimentos completos | RF-050,RF-051 | P-I04,P-E11 | D2 |
| US-035 | Reanudar exactamente desde un checkpoint | RF-052 | P-I05,P-L12 | D3 |
| US-036 | Aprender con retos, pistas y soluciones | RF-053 | P-I09,P-E12 | D3 |
| US-037 | Compartir un taller y conservar progreso local | RF-054,RF-055 | P-I09,P-E12 | D3 |
| US-038 | Trabajar offline y actualizar sin perder sesión | RF-056,RF-057 | P-O01/02/03,P-E17 | D4 |
| US-039 | Entregar evidencia con configuración y resultados | RF-060 | P-L12,P-E11 | D3 |
| US-040 | Validar varias particiones sin contaminar test | RF-062 | P-I11,P-E14 | D3 |
| US-041 | Distinguir calibración, ranking y umbral | RF-063,RF-064 | P-L09 | D3 |
| US-042 | Comparar costes y errores en sus unidades | RF-065 | P-L09,P-L10 | D3 |
| US-043 | Observar cuándo cambia el problema entre cohortes | RF-066 | P-L12 | D3 |
| US-044 | Añadir nuevos conceptos sin renumerar el catálogo | RF-068 | P-I10,P-I13,P-E13 | D3 |

## Épicas y ramas funcionales previstas

| Rama | Historias / propósito |
|---|---|
| `feat/vue-foundation` | US-001/002, estructura, tipos, router y CI básica |
| `feat/design-system-settings` | US-003/005, temas, controles y responsive |
| `feat/neuron-playback` | US-004/013, primer vertical funcional |
| `feat/data-pipeline` | US-006–012, importación, defectos y split |
| `feat/mlp-engine` | US-014–018, motor, activaciones y gradientes |
| `feat/worker-training` | US-019–022, Worker y entrenamiento |
| `feat/evaluation` | US-029/030/041/042, métricas y test |
| `feat/model-serialization` | US-033–035, biblioteca, intercambio y checkpoints |
| `feat/optimization-visuals` | US-023–025, superficies 2D/3D |
| `feat/generalization` | US-026–028, regularización y early stopping |
| `feat/vision-lab` | US-031, CNN como operadores |
| `feat/experiment-comparison` | US-032/039/040/043, A/B, CV, deriva e informes |
| `feat/workshops-open-catalog` | US-036/037/044, talleres y catálogo extensible |
| `feat/offline-pages` | US-038, PWA y configuración Pages |
| `test/cross-browser-quality` | Cierre transversal de RNF y pruebas reales |

Cada rama nace del main integrado que contiene sus dependencias. Una historia puede dividirse en ramas más pequeñas sin inventar trabajo completado. Commits al cerrar cambios coherentes: código con sus pruebas y documentación asociada, no snapshots arbitrarios cada cierto número de minutos. No se promete un demonio de autocommit futuro: los commits los realizará el agente durante las sesiones de desarrollo autorizadas.

## Flujo Git acordado

1. Comprobar árbol de trabajo y rama; crear rama descriptiva.
2. Implementar incremento, documentarlo y ejecutar controles pertinentes.
3. Commit local con prefijo `feat`, `fix`, `test`, `docs` o `chore` y mensaje concreto.
4. Integrar en main con `--no-ff` para conservar la rama en el grafo; registrar validación.
5. Comprobar árbol limpio y continuar con la siguiente historia.

Mantener ramas documentales al terminar esta entrega para inspeccionar el diseño; las ramas funcionales podrán eliminarse después de integrar si se acuerda. No usar force-push, no reescribir historia y no agregar el proyecto original al nuevo repositorio. Las ramas son trabajo real, no commits vacíos para aparentar progreso. No se crean issues remotos, PR ni despliegue en la fase documental.

## Trabajo documental de D0

DOC-01 inicializar repositorio; DOC-02 auditoría/requisitos; DOC-03 interacción/taller; DOC-04 motor/arquitectura; DOC-05 ampliar catálogo; DOC-06 UML/calidad/backlog; DOC-07 comprobación y entrega. Cada bloque se registra en su rama local y se integra en main. El resultado de controles se añade en [verificación](19-verificacion.md); el historial real se consulta con `git log --graph --oneline --all`.

## Criterio para iniciar implementación

La revisión debe confirmar o corregir alcance, diseño, límites y prioridades. Tras esa revisión se empieza D1; esta puerta procede de la petición del usuario de revisar primero la especificación. No se requiere aprobar cada commit reversible dentro de una fase ya autorizada.
