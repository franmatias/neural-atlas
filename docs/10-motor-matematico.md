# Especificación del motor matemático

Convenciones normativas para evitar que explicación y cálculo difieran. Números JS de doble precisión y `Float64Array`; clasificación de K clases, regresión de una salida. Los cálculos no dependen del renderer ni del tamaño de viewport.

## Tensores y orden

Para una muestra, `a⁰=x`, `Wˡ` tiene forma `[out,in]` en orden fila, `bˡ` forma `[out]`, `zˡ=Wˡaˡ⁻¹+bˡ`. Batch de B muestras: entradas `[B,in]`. Guardar matrices en orden explícito y comprobar dimensiones antes de operar. Número de parámetros densos: Σ(out·in+out); BN añade 2·out por capa normalizada. Running mean/variance de BN no cuentan como entrenables.

Capas ocultas: Dense → BN opcional → activación → dropout opcional. Salida: Dense → sigmoid/softmax/lineal según tarea; sin BN/dropout en salida. El caché de entrenamiento guarda valores previos/post BN, activaciones, máscaras y estadísticas. Inferencia no muta caché de gradientes ni estadísticas. No actualizar pesos hasta calcular todos los gradientes con los parámetros anteriores.

## Activaciones

| Función | Valor | Derivada / convención |
|---|---|---|
| Lineal | z | 1 |
| Escalón | z≥0 ? 1 : 0 | No disponible para backprop; perceptrón demostrativo |
| Sigmoid | 1/(1+exp(−z)) con ramas estables | a(1−a) |
| Tanh | tanh(z) | 1−a² |
| ReLU | max(0,z) | z>0 ? 1 : 0, incluido cero |
| Leaky ReLU | z>0 ? z : αz | z>0 ? 1 : α, incluido cero |
| Softmax | exp(zᵢ−m)/Σexp(zⱼ−m), m=max z | Jacobiano Jᵢⱼ=pᵢ(δᵢⱼ−pⱼ); con CE se usa gradiente fusionado |

Softmax es vectorial, sigmoid se calcula sin overflow usando exp(z) para z<0. El escalón se muestra pero no se ofrece como activación entrenable por descenso de gradiente. Diferencias finitas no verifican puntos de quiebre de ReLU/MAE/L1.

## Pérdidas y salida

Para B ejemplos, la pérdida de datos es media de pérdidas por muestra. En regresión de una salida: MSE = mean((ŷ−y)²), gradiente respecto a ŷ = 2(ŷ−y)/B; MAE = mean(|ŷ−y|), gradiente sign(ŷ−y)/B con sign(0)=0. No llamar MSE a la mitad del MSE.

Binaria: `BCE(z,y)=max(z,0)−yz+log1p(exp(−abs(z)))`, y∈{0,1}. Gradiente fusionado de logits `(sigmoid(z)−y)/B`. Multiclase: `CE(z,c)=logsumexp(z)−z[c]`, gradiente `(pᵢ−1[i=c])/B`. Entrenamiento siempre usa logits estables, sin recortar probabilidades antes de derivar; solo el texto mostrado redondea. En la fórmula educativa log(p) se explica la equivalencia y el límite de representabilidad.

Combinaciones permitidas: binaria→1 salida sigmoid/BCE; multiclase→K salidas softmax/CE; regresión→1 salida lineal/MSE o MAE. Red de perceptrón escalón se evalúa sin estas rutas de backprop. Si clasificación tiene exactamente dos clases puede mostrarse softmax de K=2 como alternativa explícita, conservando tipo de salida en el formato.

Objetivo total: `Ltotal=Ldatos+λ1 Σ|W|+(λ2/2)ΣW²`, excluyendo b, gamma y beta. Regularización no se divide otra vez por B ni N. Gradientes añaden λ1 sign(W)+λ2 W una vez por actualización. Curvas de generalización comparan pérdida de datos train/val; panel independiente muestra penalización y total. L2 aquí es penalización acoplada al gradiente, no AdamW.

## Backpropagation

Con salida fusionada se obtiene δ de logits. Por capa dW=δᵀ·a_previa, db=Σ_B δ, y gradiente previo=δ·W; el factor 1/B se introduce una sola vez en la pérdida. Aplicar máscara dropout, derivada de activación y backward BN en orden inverso. Sumar contribuciones antes de mutar parámetros. El inspector conserva índices de muestra, capa y neurona, y explica que un gradiente de batch agrega muestras.

Verificación centrada: `(L(θ+ε)−L(θ−ε))/(2ε)`, ε=1e-5, error relativo `|ga−gn|/max(1,|ga|,|gn|)≤1e-5`. Usar matrices pequeñas, valores alejados de quiebres, sin ruido/dropout; para BN comparar gradiente de batch completo con estadísticas calculadas sin actualizar acumuladores. Verificar W, b, gamma y beta, no solo el último peso.

## Inicialización y RNG

Xavier uniforme `U(−sqrt(6/(fanIn+fanOut)), +sqrt(6/(fanIn+fanOut)))`; He normal `N(0,2/fanIn)` con Box–Muller. Sesgos a cero, gamma=1 y beta=0. Inicialización a cero disponible solo para demostrar simetría y señalada como tal. ReLU sugiere He y tanh/sigmoid Xavier, sin impedir comparación deliberada.

PRNG propuesto Mulberry32 con estado uint32 y derivación determinista de streams mediante hash de semilla+propósito. Algoritmo, versión, estado y valor gaussiano cacheado se serializan; se testean vectores conocidos. Fisher–Yates para cada época. Ningún módulo del dominio llama a Math.random ni Date para obtener aleatoriedad.

## Lotes y contadores

Train se recorre una vez por época, incluyendo cola incompleta. Sin BN, número de actualizaciones por época `ceil(Ntrain/B)`. SGD es B=1; batch GD B=Ntrain; mini-batch B intermedio. Optimizador y estrategia son controles independientes. Iteración significa actualización de parámetros, no mensaje de Worker ni fotograma.

BN requiere B efectivo≥2. Si el último lote sería de una muestra, se combina con el anterior, permitiendo tamaño efectivo B+1 y una actualización menos; el reproductor muestra tamaño efectivo y razón. Se bloquean SGD+BN y train con menos de dos muestras. Se registran IDs por lote para checkpoints y explicación; no se pierden muestras silenciosamente.

## Optimizadores

Sea g gradiente tras regularización y clipping, η tasa actual, t contador de actualizaciones compartido por todos los parámetros. Estado de optimizador tiene misma forma que parámetros.

- SGD: θ←θ−ηg.
- Momentum: v←βv+g; θ←θ−ηv. Variante sin factor (1−β), sin Nesterov; v inicial cero.
- RMSprop: s←ρs+(1−ρ)g²; θ←θ−ηg/(sqrt(s)+ε). Sin centrado ni momentum adicional.
- Adam: m←β1m+(1−β1)g; v←β2v+(1−β2)g²; m̂=m/(1−β1ᵗ), v̂=v/(1−β2ᵗ); θ←θ−ηm̂/(sqrt(v̂)+ε).

Clipping opcional norma global: si ||g||₂>c, g←g·c/(||g||₂+1e-12), c por defecto desactivado, rango 0,1–100. Registrar norma original, norma aplicada y frecuencia de clipping. Validar finitud antes y después del paso; calcular paso en buffers temporales y confirmar solo si finito.

Scheduler por épocas con índice k desde cero: constante η0; step `ηk=η0·γ^floor(k/s)`; coseno `ηmin+(η0−ηmin)(1+cos(π min(k,T)/T))/2`. El estado exportado indica qué época comienza y evita adelantar scheduler al reanudar a mitad de lote. Warmup no forma parte de la primera versión.

## Regularización con estado

Dropout invertido en train: m∼Bernoulli(1−p), a′=a·m/(1−p); backward mismo factor. Eval sin máscara ni reescalado. RNG específico y reproducible, p<1.

BN por feature: μ=mean_B(z), σ²=mean_B((z−μ)²), x̂=(z−μ)/sqrt(σ²+ε), u=γx̂+β. ε=1e-5. EMA running: r←0,9r+0,1·estadística de batch, con varianza poblacional también en running, inicial μ=0 y var=1; primera estadística reemplaza el inicial mediante indicador initialized. Convención propia documentada, sin afirmar compatibilidad numérica exacta con frameworks. Eval usa running congeladas.

Backward BN: dbeta=Σdu, dgamma=Σ(du·x̂), dz=(γ/sqrt(σ²+ε))/B ·(B·du−Σdu−x̂Σ(du·x̂)). Si dL ya está promediado, esta división B pertenece a la derivada de normalización y no es un segundo promedio de la pérdida.

Early stopping observa pérdida de datos val al final de época. Mejora si `best−current>minDelta`; primer finito fija best. Incrementar contador de no mejora; detener al alcanzar patience. Restaurar W/b y running/gamma/beta del mejor checkpoint. Para continuar exactamente desde él, restaurar también optimizador/RNG/scheduler; el resultado indica época de parada y época restaurada.

## Métricas y figuras

Accuracy=(TP+TN)/N; precision=TP/(TP+FP); recall=TP/(TP+FN); F1=2TP/(2TP+FP+FN). Multiclase usa cada clase como positiva; macro media no ponderada y weighted pondera support. Denominador cero: valor por clase `null`, render «no definida»; agregación usa cero con aviso. Confusión filas real/columnas predicción. Umbral binario p≥τ; empate multiclase menor índice. Regresión: MSE, MAE, RMSE y residuos en unidades originales.

Superficies analíticas: cuenco `0,5(x²+4y²)`; silla `x²−y²`; doble pozo `(x²−1)²+y²`; Rosenbrock `(1−x)²+100(y−x²)²`. Gradientes analíticos probados por diferencias finitas. En superficies no acotadas no prometer mínimo global. Cortes reales evalúan en modo inferencia un snapshot con pipeline y train fijos; opcional penalización se identifica expresamente.

Correlación 2D: `out=floor((in+padBefore+padAfter−kernel)/stride)+1`; padding same produce ceil(in/stride), con sobrante al final. Max-pool no añade padding por defecto y desempata primer índice en orden fila. La animación muestra operaciones reales del operador, no una CNN aprendiendo cuando los filtros están fijados manualmente.
