# Historias, entregas y plan Git · revisión 0.2

Las 65 historias definen el alcance completo. US-001–US-005, US-013 y US-065 tienen una primera implementación en D1; [su informe](23-implementacion-d1.md) registra evidencia y límites de aceptación. US-006–US-011 se implementan en D2, con [contratos y evidencia propios](25-implementacion-d2.md). US-014–US-019 y US-049 se implementan en D3, con [motor, laboratorios y pruebas](26-implementacion-d3.md). D4–D6 se implementaron mediante los incrementos documentados en los informes 29–40. El [cierre técnico D7](44-cierre-d7.md) cubre US-012, US-032, US-040, US-043, US-054 y US-062. [D8.1](45-evaluacion-probabilidades.md) implementa evaluación probabilística y costes; D8 sigue en curso y D9–D10 siguen pendientes, al igual que la validación humana en aula; las extensiones X1/X2 permanecen propuestas. Cada una tiene RF, pruebas y entrega de aceptación sin depender de funcionalidades de una entrega posterior. RF → módulo → historia → prueba se publica en [la matriz completa](21-trazabilidad-rf.md). Los sufijos a/b de pruebas separan recorridos básicos y ampliados reales, no permiten cerrar una historia sin su evidencia de la entrega.

## MVP, alcance completo y extensiones

- **MVP 1.0, D1–D5:** L01–L06 y evaluación básica L09/L10, T01–T05, biblioteca IDB, importación/exportación, regresión lineal/logística, POE, diagnóstico y mapas de activación. Sin BN/dropout/CV/3D/PWA/calibración/árbol/kNN. Catálogo muestra solo experiencias implementadas o marca las restantes como previstas.
- **Versión 1.1, D6–D10:** completa el alcance original: regularización, L07/L08/L11/L12, CV, evaluación avanzada, 3D, doce talleres, catálogo ampliable, grafo/repaso, paquete docente y PWA. Los 140 conceptos previos se revisan aquí; nuevos conceptos pueden tener targetRelease posterior.
- **Extensiones 1.2 propuestas, X1–X2:** kNN/árbol, grid, permutación, sonificación, deshacer configuración y datasets reales opcionales. Se especifican y trazan, pero no se añaden a la puerta del MVP ni son una promesa de entrega sin revisión posterior.

## Historias y aceptación

| Historia | Como usuario quiero… / resultado | RF | Pruebas | Fase |
|---|---|---|---|---|
| US-001 | Navegar y volver a ruta conservando contexto | RF-001,RF-004 | P-E01,P-E16 | D1 |
| US-002 | Buscar el contenido ya disponible y elegir nivel | RF-002,RF-003 | P-I10a,P-E01 | D1 |
| US-003 | Tema y ajustes accesibles/adaptables | RF-005,RF-006 | P-E15,P-V01 | D1 |
| US-004 | Reproducir las fases de la neurona y su traza | RF-007,RF-008 | P-L02,P-E04a | D1 |
| US-005 | Proyectar L02 y recuperar sus presets | RF-009,RF-010 | P-E01,P-E15 | D1 |
| US-006 | Generar ejemplos reproducibles | RF-011 | P-L01 | D2 |
| US-007 | Inducir defectos y ver su procedencia | RF-012 | P-L01,P-E02 | D2 |
| US-008 | Importar CSV/JSON con errores localizados | RF-013,RF-019 | P-I01,P-S01 | D2 |
| US-009 | Editar y exportar datasets | RF-014,RF-015 | P-E02,P-I08 | D2 |
| US-010 | Separar muestras/grupos y tiempo sin fuga | RF-016,RF-061 | P-L01 | D2 |
| US-011 | Ajustar pipeline solo con train | RF-017,RF-018 | P-L01,P-I01 | D2 |
| US-012 | Comparar pipelines/features avanzadas | RF-020,RF-067 | P-L01,P-L12 | D7 |
| US-013 | Comprender una neurona con números reales | RF-021 | P-L02,P-E03a | D1 |
| US-014 | Entrenar perceptrón y contrastar XOR | RF-022 | P-L03,P-E03b | D3 |
| US-015 | Construir red y contar parámetros | RF-023 | P-L03 | D3 |
| US-016 | Comparar inicialización en sección avanzada L04 | RF-024 | P-L04 | D3 |
| US-017 | Explorar activaciones/derivadas | RF-025 | P-L04 | D3 |
| US-018 | Seguir forward/backward y actualización única | RF-026,RF-027 | P-L05,P-E04b | D3 |
| US-019 | Distinguir época/lote/update y ver barajado | RF-028,RF-029 | P-L06 | D3 |
| US-020 | Entrenar/cancelar y recuperar checkpoint básico automático | RF-030,RF-059 | P-I03,P-I05a,P-E05 | D4 |
| US-021 | Optimizar y programar la tasa | RF-031,RF-032 | P-L06 | D4 |
| US-022 | Usar pérdidas y telemetría reales | RF-033,RF-034 | P-L06,P-E06 | D4 |
| US-023 | Explorar trayectoria y superficie 2D/3D | RF-035 | P-L07,P-E09 | D9 |
| US-024 | Distinguir corte real y paisaje ilustrativo | RF-036 | P-L07,P-I12 | D9 |
| US-025 | Examinar normas/clipping por capa | RF-037 | P-L04,P-L08 | D6 |
| US-026 | Probar L1/L2/dropout/BN reales | RF-038,RF-039 | P-L08,P-E08 | D6 |
| US-027 | Restaurar mejor checkpoint de validación | RF-040 | P-I06,P-E08 | D6 |
| US-028 | Aumentar train válidamente y comparar capacidad | RF-041,RF-042 | P-L08 | D6 |
| US-029 | Evaluar clasificación/regresión básica con soporte | RF-043,RF-044 | P-L09,P-L10 | D4 |
| US-030 | Reservar test y reconocer límites probabilísticos | RF-045,RF-046 | P-E06,P-E07 | D4 |
| US-031 | Inspeccionar kernel/pooling | RF-047 | P-L11,P-E10 | D9 |
| US-032 | Comparar A/B aislando una variable | RF-048 | P-L12,P-E14a | D7 |
| US-033 | Guardar biblioteca IDB y gestionar cuota | RF-049,RF-058 | P-I07,P-E11a | D5 |
| US-034 | Intercambiar modelos/experimentos básicos | RF-050,RF-051 | P-I04,P-E11a | D5 |
| US-035 | Reanudar checkpoint completo tras BN/dropout/early stopping | RF-052 | P-I05b,P-L12 | D6 |
| US-036 | Aprender con T01–T05, pistas y soluciones | RF-053 | P-I09,P-E12a | D5 |
| US-037 | Compartir taller básico y conservar progreso | RF-054,RF-055 | P-I09,P-E12a | D5 |
| US-038 | Usar PWA offline y actualizar sin perder sesión | RF-056,RF-057 | P-O01/02/03,P-E17 | D10 |
| US-039 | Exportar evidencia básica y reflexión | RF-060 | P-E11a,P-E12a | D5 |
| US-040 | Ejecutar CV sin usar folds para early stopping | RF-062 | P-I11,P-E14b | D7 |
| US-041 | Evaluar calibración/ranking | RF-063,RF-064 | P-L09 | D8 |
| US-042 | Comparar costes y métricas avanzadas | RF-065 | P-L09,P-L10 | D8 |
| US-043 | Experimentar con cambios de distribución | RF-066 | P-L12 | D7 |
| US-044 | Importar conceptos abiertos y comprobar relaciones | RF-068 | P-I10b,P-I13,P-E13 | D10 |
| US-045 | Completar T06–T12 después de sus laboratorios | RF-053 | P-E12b,P-Q02 | D9 |
| US-046 | Predecir antes de ver y contrastar observación | RF-069 | P-Q01 | D5 |
| US-047 | Diagnosticar fallos plantados sin saltar invariantes | RF-070 | P-Q02 | D9 |
| US-048 | Recibir hipótesis de diagnóstico justificadas | RF-071 | P-Q03 | D4 |
| US-049 | Inspeccionar mini-mapas de activación accesibles | RF-072 | P-Q04 | D3 |
| US-050 | Ajustar funciones y sumar contribuciones | RF-073 | P-Q05,P-L10 | D8 |
| US-051 | Orientarme con grafo/lista de conceptos | RF-074 | P-Q06 | D10 |
| US-052 | Autoevaluarme y repasar sin nota oficial | RF-075 | P-Q07 | D10 |
| US-053 | Exportar paquete con guía docente | RF-076 | P-Q08 | D10 |
| US-054 | Comparar A/B sincronizado en proyector | RF-077 | P-Q09 | D7 |
| US-055 | Comparar regresión lineal/logística con MLP | RF-078 | P-Q10 | D4 |
| US-056 | Comparar kNN/árbol acotados | RF-079 | P-Q11 | X1 |
| US-057 | Explorar rejilla limitada y presupuesto | RF-080 | P-Q12 | X1 |
| US-058 | Interpretar importancia por permutación | RF-081 | P-Q13 | X1 |
| US-059 | Activar sonificación opcional y silenciar | RF-082 | P-Q14 | X2 |
| US-060 | Abrir preset de un error frecuente | RF-083 | P-Q15 | D10 |
| US-061 | Deshacer configuración sin fingir rollback de pesos | RF-084 | P-Q16 | X2 |
| US-062 | Ver segmentos en curvas/timeline | RF-085 | P-Q17 | D7 |
| US-063 | Usar datasets reales licenciados opcionales | RF-086 | P-Q18 | X2 |
| US-064 | Debatir ética con evidencia y contexto | RF-087 | P-Q19 | D8 |
| US-065 | Añadir locales sin cambiar el motor | RF-088 | P-Q20 | D1 |

## Fases, dependencia y esfuerzo orientativo

Jornadas de ingeniería de una persona con familiaridad con Vue/ML, no horas de ejecución del agente ni calendario comprometido. Incluyen código, tests, documentación y revisión; incertidumbre alta hasta el primer vertical. Validación en aula y traducciones requieren personas disponibles y se estiman aparte.

| Fase | Entrega | Depende de | Historias | Esfuerzo |
|---|---|---|---|---|
| D1 | Shell, L02, accesibilidad/CSP/decimal/i18n | D0 revisado | 7 | 6–10 jornadas |
| D2 | Datos, defectos, split/pipeline e intercambio dataset | D1 | 6 | 5–8 jornadas |
| D3 | MLP, perceptrón, L03–L05, lotes y activaciones/mapas | D2 | 7 | 6–10 jornadas |
| D4 | Worker/optimización básica, clasificación/regresión y diagnóstico | D3 | 7 | 6–10 jornadas |
| D5 | IDB, intercambio modelo, POE, T01–T05 y evidencia; puerta MVP | D4 | 6 | 6–10 jornadas |
| D6 | Regularización/BN, augmentation/early stopping y checkpoint completo | D5 | 5 | 8–14 jornadas |
| D7 | Comparación, CV, features/deriva y segmentos | D6 | 6 | 7–12 jornadas |
| D8 | Evaluación avanzada, aproximación de funciones y ética | D7 | 4 | 5–9 jornadas |
| D9 | Vistas 2D/3D, CNN didáctica, fallos y T06–T12 | D8 | 5 | 7–12 jornadas |
| D10 | Catálogo abierto, repaso/paquetes, PWA y puerta v1.1 | D9 | 6 | 7–12 jornadas |
| X1 | Comparadores, grid y permutación propuestos | v1.1 y revisión de alcance | 3 | 5–9 jornadas |
| X2 | Extras opcionales de acceso/sesión/datos | v1.1 y revisión de alcance | 3 | 4–7 jornadas |

MVP estimado 29–48 jornadas; ampliación v1.1 añade 34–59. No sumar pruebas al final: tipos/lint/unidad/E2E de lo implementado y accesibilidad forman parte de **cada fase**. D4 mide rendimiento Worker y P-Max denso; D6 añade BN y checkpoint; D9 mide GPU/fallback; D10 certifica offline, sin ser el depósito de toda la calidad.

## Ramas cerrables por entrega

| Fase | Ramas propuestas, nacidas del main integrado de la fase anterior |
|---|---|
| D1 | feat/d1-shell-settings, feat/d1-neuron-playback, test/d1-accessibility-csp |
| D2 | feat/d2-datasets, feat/d2-split-pipeline |
| D3 | feat/d3-mlp-perceptron, feat/d3-activations-maps, feat/d3-backprop |
| D4 | feat/d4-worker-recovery, feat/d4-training-evaluation, feat/d4-diagnostics |
| D5 | feat/d5-indexeddb-model-files, feat/d5-poe-workshops |
| D6 | feat/d6-generalization, feat/d6-complete-checkpoints |
| D7 | feat/d7-experiments-cv, feat/d7-comparison-segments |
| D8 | feat/d8-metrics-functions-ethics |
| D9 | feat/d9-3d-vision, feat/d9-investigation-workshops |
| D10 | feat/d10-open-catalog-practice, feat/d10-teaching-packs, feat/d10-offline-pages |
| X1/X2 | Ramas nuevas solo cuando se autorice esa extensión |

Cada rama contiene un incremento real, pruebas pertinentes y documentación; no permanece abierta esperando una fase futura. La historia US-035 cierra después de BN/dropout/parada temprana: el esquema básico de D4 ya tiene ranuras versionadas para esos estados, sin afirmar que están implementados. Búsqueda D1 cubre registros empaquetados existentes; importar y ampliar es D10. Las pruebas 03a/04a no exigen XOR/backprop aún no construidos.

## Flujo Git

Comprobar árbol y rama → crear rama descriptiva → implementar/verificar incremento → commit coherente → integrar main con --no-ff → comprobar árbol limpio. Prefijos feat/fix/test/docs/chore. El agente hace commits durante trabajo autorizado; no hay daemon de autocommit. No reescribir historia ni hacer force-push. Mantener ramas documentales para revisar; original fuera del repo nuevo. Tras D0, el usuario autorizó la implementación, los commits/fusiones y la publicación mediante CI en franmatias/neural-atlas. El despliegue de main sigue condicionado a superar sus controles; no se crean issues, mensajes ni PR por inferencia.

Las [dependencias críticas](fixtures/story-dependencies.json) se verifican sin ciclos ni referencias a fases futuras; cada fase además parte del main ya integrado de su predecesora. No es una estimación automática del calendario ni sustituye el orden de trabajo dentro de cada fase.

La especificación 0.1 quedó en seis ramas documentales. La revisión 0.2 añade ramas reales de contratos, experiencias educativas, planificación/trazabilidad y verificación/diagramas. Los commits documentales no se presentan como historias funcionales implementadas. La implementación se inició después de aquella revisión. Los informes de cada entrega y el cierre D7 prevalecen para consultar el estado actual; no se pide aprobación por cada commit reversible dentro del alcance autorizado.
