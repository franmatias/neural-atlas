# Estrategia de pruebas y aceptación

**Estado:** plan para la aplicación futura. Esta entrega solo ejecuta comprobaciones documentales; no hay una batería de producto ya implementada ni porcentajes de cobertura medidos. La ejecución de las 11 pruebas del original se registra en [auditoría](01-auditoria.md).

## Capas y herramientas

| Capa | Herramienta | Qué demuestra |
|---|---|---|
| Unidad | Vitest y fast-check | Matemáticas, RNG, dimensiones, contratos, invariantes y bordes |
| Componentes | Vitest + Vue Test Utils con DOM de prueba | Campos, validaciones, foco, eventos y estados de UI |
| Integración | Vitest y Playwright para Worker real | Casos de uso, pipeline, serialización, repositorio y protocolo |
| E2E | Playwright sobre build de producción | Recorridos completos, descargas/importaciones, offline y rutas |
| Accesibilidad | axe-core/Playwright + revisión manual | Errores automáticos y teclado/lector de pantalla que axe no prueba |
| Visual | Playwright snapshots | Temas, breakpoints, gráficos y estados estables |
| Rendimiento | Performance API, Playwright y análisis del bundle | Latencia, cancelación, frames, memoria y tamaño |
| Documentación | Parser Mermaid, enlaces locales y trazabilidad | Sintaxis y referencias del diseño, sin probar el motor |

No se crean tests que solo repitan el código. Los oráculos serán resultados calculados a mano, fixtures independientes, diferencias finitas y propiedades verificables. Una prueba de descenso de pérdida solo se exige en fixture convexo/controlado y con tasa conocida; no se exige descenso monótono general con SGD.

## Fixtures y oráculos matemáticos

- Neurona x=[0,8;0,2], W=[0,5;−0,3], b=0,1: z=0,44, sigmoid≈0,6082590307.
- Clasificación binaria con TP=3, FP=1, TN=4, FN=2: accuracy=0,7; precision=0,75; recall=0,6; F1=2/3. Matriz real×pred `[[4,1],[2,3]]`.
- Regresión y=[1,2,3], ŷ=[1,2,4]: MSE=1/3, MAE=1/3, RMSE=sqrt(1/3), R²=0,5.
- Logits [1.000,1.000,1.000]: probabilidades 1/3 y CE=log(3); BCE con logit 1.000 y target 0 aproximadamente 1.000, sin NaN.
- Un paso SGD θ=1, g=2, η=0,1 produce 0,8. Adam primer paso con g=2, estados cero y defaults produce aproximadamente 0,9, considerando ε.
- Split de 20 IDs, 70/15/15: 14/3/3, sin intersección. Duplicados con groupId jamás cruzan grupos.
- Matriz 3×3 de 1 a 9, kernel 2×2 de unos, stride 1 valid: salida `[[12,16],[24,28]]`. Pool 2×2 de esa salida produce 28.
- ROC/AP: etiquetas [0,1,0,1], scores [0,1;0,4;0,35;0,8] producen ROC-AUC=0,75, AP=5/6. Comprobar además scores empatados y una clase ausente.

Fixtures numéricos guardados como JSON versionados con cálculo independiente documentado; no generarlos con la función que se está probando. Tolerancias explícitas por test. RNG tiene vectores exactos por semilla. Test de distribución de inicialización usa muestra amplia y márgenes deterministas, sin aleatoriedad del sistema.

## Suite por laboratorio

| ID | Casos obligatorios |
|---|---|
| P-L01 | Repetibilidad, defectos acotados, split disjunto/agrupado/temporal, fit solo train, faltantes, constantes, desconocidas, robust scaler y features derivadas |
| P-L02 | Suma/predicción de fixture, signos, b, pesos nulos y frontera indefinida |
| P-L03 | XOR lineal ≤3/4, ejemplo ReLU 4/4, contador denso/BN, límites de arquitectura y Xavier/He |
| P-L04 | Activaciones/derivadas, quiebres por convención, softmax con extremos y Jacobiano |
| P-L05 | Diferencias finitas de W/b por capa, sustituciones del inspector y una sola mutación por fase apply |
| P-L06 | Batch incompleto, excepción BN, contadores, cuatro optimizadores y schedulers; clasificación/regresión compatibles |
| P-L07 | Gradientes de superficies, puntos silla/mínimos conocidos, paso de trayectoria y corte congelado que no altera modelo |
| P-L08 | L1/L2, dropout train/eval, BN forward/backward/EMA, clipping, early stopping y augment solo train |
| P-L09 | Confusión y métricas, ceros/empates, umbrales, desbalance, ROC/AP, Brier/calibración y costes |
| P-L10 | Regresión, unidades/inversa target, baseline train, residuos/R² constante y extrapolación |
| P-L11 | Padding same asimétrico, stride, dimensiones, filtros y empates de pooling |
| P-L12 | Comparación A/B aislada, exportación y reanudación, CV sin fuga, deriva y agregación multisemilla |

Cada P-Lxx contiene unitarias, prueba de interacción del laboratorio y al menos un recorrido E2E. La [matriz de conceptos](06-matriz-conceptos.md) asigna cada concepto a esta suite; una suite no equivale a una sola aserción.

## Integración

| ID | Flujo y borde |
|---|---|
| P-I01 | CSV → mapeo → validación → split → fit → tensores; errores no sustituyen sesión |
| P-I02 | Dominio y handler de Worker intercambian mensajes validados y conservan contadores |
| P-I03 | Worker real pausa/cancela, descarta batch parcial y no acepta eventos obsoletos |
| P-I04 | Guardar/importar modelo conserva predicción y orden de clases/pipeline |
| P-I05 | Checkpoint completo reanuda igual que ejecución ininterrumpida, incluido dropout/BN/Adam |
| P-I06 | Early stopping restaura mejor inferencia y reanuda estado correcto |
| P-I07 | LocalStorage cuota/denegación/corrupción/migración/conflicto entre pestañas |
| P-I08 | Cambiar datos o topología invalida hashes y test; tema/cámara no invalidan |
| P-I09 | Taller evalúa reglas permitidas y persiste evidencia sin ejecutar código |
| P-I10 | Catálogo abierto añade C141 y C1000, relaciones válidas, rechaza ciclos/conflictos/versiones ilegales |
| P-I11 | CV reconstruye fit/modelo por fold, excluye test y respeta grupos |
| P-I12 | 2D/3D consumen mismo snapshot; dispose de escenas y listeners al cambiar ruta |
| P-I13 | Paquete de conceptos/talleres con strings hostiles se representa como texto |
| P-I14 | Hash canónico estable ante orden de claves; edición de valor cambia identidad |

## E2E de producto

P-E01 onboarding y volver a actividad; P-E02 generar/importar datos, corregir una fila y exportar; P-E03 neurona/XOR con teclado; P-E04 forward/backward paso a paso; P-E05 entrenar/pausar/lote/época/cancelar con Worker real; P-E06 clasificación binaria y multiclase; P-E07 regresión y test final; P-E08 regularización y early stopping; P-E09 superficie 3D y fallback 2D; P-E10 kernel/pooling; P-E11 guardar/exportar/recargar/importar/reanudar; P-E12 completar taller con pista; P-E13 importar concepto nuevo y encontrarlo; P-E14 A/B y CV; P-E15 tema/ajustes persistentes y reduced-motion; P-E16 rutas de producción en subruta; P-E17 offline y actualización segura; P-E18 datos corruptos/cuota/Worker caído.

Playwright inicia `webServer` sobre preview de build y base de producción. Chromium, Firefox y WebKit de escritorio para recorridos críticos; dispositivos de 390×844 y 768×1024 para interacción táctil en Chromium/WebKit. Edge con canal real y Safari real se verifican en un smoke manual o infraestructura disponible, sin afirmar que WebKit de Playwright certifica todos los Safari. Sin esperas fijas: esperar estado, eventos o locators por rol. Un retry máximo en CI con traza y captura; flaky no se acepta como éxito silencioso.

## Cobertura y puertas

Vitest con proveedor V8 e inclusión de **todo src**, aunque no haya sido importado por tests. Umbrales mínimos:

| Área | Lines / statements / functions | Branches |
|---|---|---|
| Dominio | 95 % | 90 % |
| Aplicación y contratos/serialización | 90 % | 85 % |
| UI y adapters de visualización | 85 % | 75 % |
| Total | 85 % | 80 % |

Infraestructura de persistencia/Worker entra en aplicación/contratos a estos efectos. Excluir solo código generado de SW y bootstrap puramente declarativo, con motivo revisado; no excluir engine, errores, parsers ni estados difíciles. Incluir handlers del Worker por imports de unidad; la prueba de Worker real complementa esa cobertura, no se inventa cobertura E2E sumándola a V8. Publicar HTML/LCOV y JUnit como artifacts futuros.

Comandos **objetivo de D1–D4**, aún no disponibles: `typecheck`, `lint`, `test:unit`, `test:integration`, `test:coverage`, `test:e2e`, `test:visual`, `test:performance`, `build`, `check`. El comando actual `docs:check` valida solo esta especificación.

## Accesibilidad, visual y rendimiento

P-A01 axe en cada ruta/tema sin serious/critical; P-A02 teclado completo, foco y lector de pantalla manual en un recorrido de taller; P-A03 contraste normal/hover/selected y movimiento reducido. Snapshots P-V01 con datos/semilla fijos, entrenamiento pausado, misma fuente y renderer estable; ambos temas y cinco anchos. WebGL se revisa aparte con tolerancia razonada y fallback determinista, sin enmascarar información central.

P-P01 fixture P mide latencia de controles y frames, 30 interacciones tras calentamiento y p95; P-P02 cancelación/pausa, 30 repeticiones bajo entrenamiento y análisis; P-P03 bundle/gzip y carga diferida; P-P04 memoria tras 20 cambios de ruta; P-P05 límites máximos y rechazo temprano. No hacer benchmark estricto en CI compartida sin hardware estable; CI bloquea regresiones grandes frente a baseline almacenada y una ejecución controlada certifica el requisito.

P-S01 importaciones hostiles/profundidad/límites/CSV injection; P-S02 política de contenido y ausencia de llamadas externas; P-O01 precaché completo, P-O02 offline real y P-O03 actualización con sesión activa. P-D01 Mermaid y enlaces, P-D02 cobertura RF/RNF/historias/conceptos y P-D03 wireframes XML/contraste de tokens documentales.

## Trazabilidad de RNF

| Requisitos | Evidencia |
|---|---|
| RNF-001/002/022 | P-L04/05/06/08 y P-I05 |
| RNF-003/004/005/007 | P-P01/02/04/05 |
| RNF-006 | P-P03 |
| RNF-008/009/010 | P-A01/02/03 y P-V01 |
| RNF-011 | Matriz de navegadores de P-E03/05/07/11/15 y smoke manual |
| RNF-012/013/023 | P-S01/02 y revisión de licencias |
| RNF-014/015 | P-I07 y P-E18 |
| RNF-016/017 | Lint de límites/ciclos, tipos y umbrales V8 |
| RNF-018 | P-D01/02 |
| RNF-019/020 | P-O01/02/03 y P-E16/17 |
| RNF-021 | P-I01/04 y revisión editorial |
| RNF-024 | P-I08/14 y P-L12 |

## Definición de terminado

Para cada historia: RF satisfechos, tipos/lint/build correctos, casos nuevos relevantes probados, cobertura respetada, estados vacíos/error/accesibilidad revisados y documentación/diagramas actualizados si cambian contratos. Para una entrega: recorridos críticos en tres motores de navegador, informe de rendimiento/licencias, ningún defecto crítico abierto y revisión pedagógica de ejemplos. Si falta un navegador o medición se registra como pendiente, no se declara probado.
