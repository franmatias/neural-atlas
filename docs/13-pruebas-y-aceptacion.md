# Estrategia de pruebas y aceptación

**Estado actual:** el [cierre técnico v1.4.0](57-cierre-x2-y-descenso-guiado.md) tiene CI, despliegue y comprobación pública superados. La aceptación humana se prepara en [el protocolo de aula](58-validacion-docente.md), con ejecución pendiente. Las tablas siguientes conservan la estrategia y decisiones originales; los informes de entrega identifican las herramientas y pruebas realmente implementadas. La ejecución de las 11 pruebas del original se registra en [auditoría](01-auditoria.md).

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
- Logits `[1000,1000,1000]`: probabilidades 1/3 y CE=log(3); BCE con logit 1000 y target 0 aproximadamente 1000, sin NaN. En JSON punto decimal y sin separadores de miles.
- Descenso simple θ=1, g=2, η=0,1 produce 0,8. Adam primer paso con **η=0,1**, g=2, estados cero, β1=0,9, β2=0,999 y ε=1e-8 produce 0,9000000005; η=0,01 daría ≈0,99.
- Split de 20 IDs, 70/15/15: 14/3/3, sin intersección. Duplicados con groupId jamás cruzan grupos.
- Matriz 3×3 de 1 a 9, kernel 2×2 de unos, stride 1 valid: salida `[[12,16],[24,28]]`. Pool 2×2 de esa salida produce 28.
- ROC/AP: etiquetas `[0,0,1,1]`, scores `[0.1,0.4,0.35,0.8]` producen ROC-AUC=0,75 y AP=5/6. Con etiquetas `[0,1,0,1]` el ranking es perfecto: AUC=AP=1. Incluir empates y clase ausente.

Fixtures numéricos guardados como JSON versionados con cálculo independiente documentado; no generarlos con la función que se está probando. Tolerancias explícitas por test. RNG tiene vectores exactos por semilla. Test de distribución de inicialización usa muestra amplia y márgenes deterministas, sin aleatoriedad del sistema.

Los [oráculos de revisión](fixtures/review-math.json) y [vectores RNG](fixtures/rng-v1.json) ya existen y los comprueba [el script documental](../scripts/check-review-fixtures.mjs): AUC por pares y AP por grupos empatados, Adam con tasa explícita, arquitectura máxima y presupuestos. Los RNG se contrastaron con aritmética uint32 independiente en Python y JS. Esto valida ejemplos de especificación, no un motor productivo todavía inexistente.

## Suite por laboratorio

| ID | Casos obligatorios |
|---|---|
| P-L01 | Repetibilidad, defectos acotados, split disjunto/agrupado/temporal, fit solo train, faltantes, constantes, desconocidas, robust scaler y features derivadas |
| P-L02 | Suma/predicción de fixture, signos, b, pesos nulos y frontera indefinida |
| P-L03 | Rosenblatt y parada, prueba XOR por desigualdades y testigo 3/4, ejemplo ReLU 4/4, MLP 2→4→1 en semillas 7/42/123 y contador/límites derivados |
| P-L04 | Activaciones/derivadas, quiebres, softmax/Jacobiano, Xavier/He y saturación/normas |
| P-L05 | Diferencias finitas de W/b por capa, sustituciones del inspector y una sola mutación por fase apply |
| P-L06 | Batch incompleto, excepción BN, contadores, cuatro optimizadores y schedulers; clasificación/regresión compatibles |
| P-L07 | Gradientes de superficies, puntos silla/mínimos conocidos, paso de trayectoria y corte congelado que no altera modelo |
| P-L08 | L1/L2, dropout train/eval, BN por fases con estadísticas de lote completo, clipping/normas, early stopping y jitter train con oráculo/rechazos |
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
| P-I03 | Worker real pausa/cancela con BN/lote completo, descarta estado candidato y eventos viejos; matar Worker sin guardado manual restaura checkpoint automático |
| P-I04 | Guardar/importar modelo conserva predicción y orden de clases/pipeline |
| P-I05 | Suite: P-I05a restaura checkpoint automático básico/Adam; P-I05b añade dropout/BN/early stopping y reanuda como ejecución ininterrumpida en mismo motor JS |
| P-I06 | Early stopping restaura mejor inferencia y reanuda estado correcto |
| P-I07 | IDB transacciones abortadas/cuota/versionchange/conflicto; LocalStorage ajustes denegados/corruptos; degradación independiente |
| P-I08 | Cambiar datos o topología invalida hashes y test; tema/cámara no invalidan |
| P-I09 | Taller evalúa reglas permitidas y persiste evidencia sin ejecutar código |
| P-I10 | P-I10a busca solo registros empaquetados disponibles; P-I10b importa C153 y C1000, valida plantilla completa/idiomas, referencias/ciclos/versiones |
| P-I11 | CV reconstruye fit/modelo por fold, excluye test, respeta grupos y no usa fold de evaluación para early stopping |
| P-I12 | 2D/3D consumen mismo snapshot; dispose de escenas y listeners al cambiar ruta |
| P-I13 | Paquete de conceptos/talleres con strings hostiles se representa como texto |
| P-I14 | Hash canónico estable ante orden de claves; edición de valor cambia identidad |

## E2E de producto

P-E01 onboarding y volver a actividad; P-E02 generar/importar datos, corregir una fila y exportar; P-E03 neurona/XOR con teclado; P-E04 forward/backward paso a paso; P-E05 entrenar/pausar/lote/época/cancelar con Worker real; P-E06 clasificación binaria y multiclase; P-E07 regresión y test final; P-E08 regularización y early stopping; P-E09 superficie 3D y fallback 2D; P-E10 kernel/pooling; P-E11 guardar/exportar/recargar/importar/reanudar; P-E12 completar taller con pista; P-E13 importar concepto nuevo y encontrarlo; P-E14 A/B y CV; P-E15 tema/ajustes persistentes y reduced-motion; P-E16 rutas de producción en subruta; P-E17 offline y actualización segura; P-E18 datos corruptos/cuota/Worker caído.

Recorridos separados para no exigir dependencias futuras: **P-E03a neurona / P-E03b XOR; P-E04a fases de neurona / P-E04b backprop; P-E11a biblioteca/intercambio básico / P-E11b reanudación con BN; P-E12a T01–T05 / P-E12b T06–T12; P-E14a A/B / P-E14b CV**. E01/E15 usan las rutas ya construidas de su fase; no necesitan simular talleres aún inexistentes. Suites P-Lxx se incorporan por comportamiento/RF de cada historia: no se declara toda una suite completa al pasar un subconjunto temprano. Cada historia cierra sus aserciones, cada laboratorio su suite final.

Playwright inicia `webServer` sobre preview de build y base de producción. Chromium, Firefox y WebKit de escritorio para recorridos críticos; dispositivos de 390×844 y 768×1024 para interacción táctil en Chromium/WebKit. Edge con canal real y Safari real se verifican en un smoke manual o infraestructura disponible, sin afirmar que WebKit de Playwright certifica todos los Safari. Sin esperas fijas: esperar estado, eventos o locators por rol. Un retry máximo en CI con traza y captura; flaky no se acepta como éxito silencioso.

## Cobertura y puertas

Vitest con proveedor V8 e inclusión de **todo src**, aunque no haya sido importado por tests. Umbrales mínimos:

| Área | Lines / statements / functions | Branches |
|---|---|---|
| Dominio | 95 % | 90 % |
| Aplicación y contratos/serialización | 90 % | 85 % |
| UI y adapters de visualización | 85 % | 75 % |
| visualization/three (incluida en total) | 65 % | 50 % |
| Total | 85 % | 80 % |

Infraestructura de persistencia/Worker entra en aplicación/contratos. Three tiene umbral propio sin excluir sus escenas del total, más E2E de montaje/dispose/picking/context loss y revisión GPU. Excluir solo SW generado y bootstrap declarativo con motivo; no excluir engine, errores o parsers. Handler Worker se importa en unidad; prueba real complementa, no se inventa cobertura E2E sumándola a V8. Publicar HTML/LCOV/JUnit como artifacts futuros.

Comandos **objetivo de D1–D10**, aún no disponibles: `typecheck`, `lint`, `test:unit`, `test:integration`, `test:coverage`, `test:e2e`, `test:visual`, `test:performance`, `build`, `check`. `docs:check` valida solo especificación y oráculos documentales.

## Accesibilidad, visual y rendimiento

P-A01 axe por ruta/tema; P-A02 teclado, lector de pantalla y botón saltar que no cambia hash; P-A03 contraste de texto/marcadores/bordes/foco y reduced-motion; P-A04 parser decimal es/en sin diferencias entre motores; P-S02 prueba CSP del build y tema sin destello ya en D1. Snapshots P-V01 limitados a **390/768/1440 px × dos temas** en pantallas estables: L02, L06 pausado, L09 y ajustes. Los cinco anchos de RNF-009 siguen comprobándose con aserciones DOM, sin generar screenshots de todas las rutas. WebGL tiene revisión GPU separada.

P-P01 fixture P mide latencia de controles y frames, 30 interacciones tras calentamiento y p95; P-P02 cancelación/pausa, 30 repeticiones bajo entrenamiento y análisis; P-P03 bundle/gzip y carga diferida; P-P04 memoria tras 20 cambios de ruta; P-P05 límites máximos y rechazo temprano. No hacer benchmark estricto en CI compartida sin hardware estable; CI bloquea regresiones grandes frente a baseline almacenada y una ejecución controlada certifica el requisito.

**P-P06** usa P-Max/P-Map/P-CV: latencia con BN y lote completo, memoria prevista/observada, throughput, antigüedad de recovery, tiempo de mapa y reducción 80→40→20→solo pausa. Comprobar que progreso 10 Hz no dispara 10 mapas/s. Mostrar coste estimado antes de ejecutar y error frente a medida como diagnóstico, no exigir duración universal. Datos/RNG enteros exactos entre motores; entrenamiento/métricas usan RNF-002 revisado, sin comparar todos los pesos de Firefox/WebKit con V8 tras miles de updates.

## Pruebas de experiencias educativas y extensiones

| ID | Evidencia requerida |
|---|---|
| P-Q01 | Hipótesis anterior a acción, baseline/observación mismo split, cancelación indeterminada, texto libre sin nota, exportación y modo libre no bloqueante |
| P-Q02 | Fallos reproducibles y solución; invalid config sigue bloqueada; fuga/skew rotulados; corrupción parcial de etiquetas distinguida de renombrado |
| P-Q03 | Cada regla con ventanas/umbrales, no hay alerta sin soporte; no mezcla runs; hipótesis y enlaces; lectura sin mutar entrenamiento |
| P-Q04 | Valor mapa = forward del snapshot en puntos de prueba; capas profundas no forzadas a semiplano; tabla/teclado y presupuesto adaptativo |
| P-Q05 | Contribuciones+bias suman salida, 1/2/8/32 neuronas, error junto a salto y límites de aproximación uniforme |
| P-Q06 | Grafo y lista equivalentes, prerrequisitos sin ciclo, estados de visita sin prometer dominio |
| P-Q07 | MCQ/VF feedback, agenda 1/3/7/14/30 con reloj falso, reset y ausencia de notificación externa |
| P-Q08 | Pack guía/datasets/presets/soluciones opcionales, referencias internas, límites y transacción abortada |
| P-Q09 | A/B sincroniza solo controles comunes, destaca variable, ejecución secuencial y proyección/tacto accesibles |
| P-Q10 | Red sin ocultas reproduce lineal/logística, mismo split/pipeline, no asumir ventaja del MLP |
| P-Q11 | kNN distancia/voto/empates, árbol Gini/MSE/splits acotados, cancelación y esquema de familias previo a publicar |
| P-Q12 | ≤9 configs/27 runs expandidos, coste visible, cancelación y ningún acceso a test durante grid |
| P-Q13 | Permutar solo copia val, sin refit ni mutar datos; signos de importancia y dispersión, cautela con correlación |
| P-Q14 | Sonido apagado inicial, gesto/volumen/mute/ocultación y equivalencia textual |
| P-Q15 | Error frecuente abre preset en copia con aviso y conserva sesión actual |
| P-Q16 | Undo ≤50 configuraciones, nueva revisión y cancelación; no prometer restaurar pesos no guardados |
| P-Q17 | Timeline conserva cambios/reinicios y no concatena métricas incompatibles |
| P-Q18 | Fichero real/hash/licencia/atribución/revisión antes de incluir, sin petición remota en runtime |
| P-Q19 | Ética usa contexto y soporte, no certifica justicia por accuracy ni prescribe coste universal |
| P-Q20 | Claves y fallback, búsqueda title.en, formato locale y ausencia de textos de UI incrustados sin traducibilidad |

Cada P-Q combina unidades/reglas, integración y recorrido de UI apropiados a su entrega; no todos requieren entrenar una red nueva para probar un componente de contenido.

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
| RNF-021 | P-I01/04, P-A04, P-Q20 y revisión editorial |
| RNF-024 | P-I08/14 y P-L12 |

## Definición de terminado

Para cada historia: RF satisfechos, tipos/lint/build correctos, casos nuevos relevantes probados, cobertura respetada, estados vacíos/error/accesibilidad revisados y documentación/diagramas actualizados si cambian contratos. Para una entrega: recorridos críticos en tres motores de navegador, informe de rendimiento/licencias, ningún defecto crítico abierto y revisión pedagógica de ejemplos. Si falta un navegador o medición se registra como pendiente, no se declara probado.
