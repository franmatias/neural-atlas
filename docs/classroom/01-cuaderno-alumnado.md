# Cuaderno de exploración

Código: ______ · Sesión: ______ · Versión observada: ______

En cada actividad escribe **predicción → observación → explicación**. Indica si consultaste la guía o recibiste ayuda. Exporta el trabajo que quieras conservar antes de cargar otro ejemplo. No uses datos personales. Puedes pedir movimiento reducido, teclado, otro tema o más tiempo.

## A01 · Datos antes que modelos · L01

[Abrir Datos](https://franmatias.github.io/neural-atlas/#/lab/datos).

Elige Iris, lee su procedencia y cárgalo explícitamente. Identifica una característica y el objetivo. Comprueba que cargar no crea automáticamente split ni escalado. Divide los datos y prepara una transformación ajustada con train. Predice qué pasaría si usaras validación para aprender el rango del escalado.

Evidencia: número de columnas/filas, particiones y una estadística aprendida. Explica por qué una proyección de dos ejes no representa todas las características. Conserva una exportación si quieres recuperar el dataset.

## A02 · Una neurona · L02

[Abrir Neurona](https://franmatias.github.io/neural-atlas/#/lab/neurona).

Restaura el primer ejemplo. Calcula la suma ponderada antes de ver la salida. Aumenta el sesgo en 0,1 y predice si la salida sigmoid aumentará exactamente 0,1. Contrasta productos, suma y activación. Explica qué hace la animación y qué necesitarías para aprender pesos.

Evidencia: valores antes/después y explicación. El sonido es opcional; prueba volumen, registro y silencio si te resulta útil. Su ausencia no impide completar la tarea.

## A03 · Arquitectura y activación · L03/L04

[Arquitectura](https://franmatias.github.io/neural-atlas/#/lab/arquitectura) · [Activaciones](https://franmatias.github.io/neural-atlas/#/lab/activaciones).

Predice si una sola recta puede separar XOR. Compara la capacidad de una red sin ocultas y otra con activación no lineal. En Activaciones compara sigmoid cerca de cero y en saturación. Explica por qué apilar transformaciones afines no elimina la limitación de XOR.

Evidencia: dibujo o descripción de XOR, observación de la frontera y dos valores de pendiente. Que una arquitectura pueda expresar una solución no garantiza encontrarla con cualquier entrenamiento.

## A04 · Propagación y actualización · L05

[Abrir Propagación](https://franmatias.github.io/neural-atlas/#/lab/propagacion).

Sigue una predicción hacia delante y un gradiente hacia atrás. Antes de actualizar un peso, predice el signo de su cambio. Distingue derivada, gradiente y actualización. Usa el inspector o comprobación numérica disponible para contrastar una sensibilidad.

Evidencia: parámetro elegido, gradiente, tasa y cambio observado. Explica por qué conocer solo el error no suele bastar para calcular el cambio de cada peso.

## A05 · El mismo descenso en dos vistas · L07

[Abrir Paisajes](https://franmatias.github.io/neural-atlas/#/lab/optimizacion).

Prepara «Un paso que puedes calcular» y calcula el estudio. Antes de avanzar desde (1,1), predice el siguiente punto de SGD con tasa 0,1. Comprueba el mismo índice en contornos y malla 3D. Avanza, retrocede y gira la cámara: ¿qué acciones cambian el índice y cuáles preparan otro cálculo?

Después prepara y calcula oscilación, divergencia y silla. Antes de cada cálculo, predice qué observarás. Explica si gradiente cero demuestra un mínimo. Si WebGL no está disponible, usa contornos y tabla y registra que la revisión 3D quedó pendiente en ese dispositivo.

Evidencia: coordenadas y pérdidas de un paso, diferencia entre dirección de la flecha y longitud del desplazamiento, y explicación de la silla. La cámara y la reproducción no vuelven a entrenar.

## A06 · Entrenar y deshacer ajustes · L06

[Abrir Entrenamiento](https://franmatias.github.io/neural-atlas/#/lab/entrenamiento).

Conserva el trabajo previo antes de cargar un ejemplo. Usa un presupuesto pequeño —por ejemplo cinco épocas— y anota arquitectura, semilla y lote. Cambia la semilla a un valor distinto antes de inicializar. Inicializa y ejecuta un lote. Predice qué recuperará «Deshacer configuración» y compruébalo. Rehaz y vuelve a inicializar explícitamente.

Evidencia: ajustes antes/después, contador de actualizaciones y estado del modelo al deshacer. Explica qué necesitarías para recuperar pesos y momentos anteriores. No evalúes test para elegir ajustes. Anota cuándo un estado del historial queda indisponible por cambiar datos/split/pipeline.

## A07 · Generalizar · L08

[Abrir Generalización](https://franmatias.github.io/neural-atlas/#/lab/generalizacion).

Compara dos condiciones manteniendo datos, split y presupuesto. Cambia un factor de regularización disponible. Predice el efecto sobre train y validación; observa ambas curvas. Una ejecución corta puede no permitir concluir: indica qué evidencia adicional necesitarías.

Evidencia: factor cambiado y pérdidas de ambas particiones. Distingue menor error train, mejor validación y garantía de rendimiento futuro.

## A08 · Clasificación y regresión · L09/L10

[Clasificación](https://franmatias.github.io/neural-atlas/#/lab/clasificacion) · [Regresión](https://franmatias.github.io/neural-atlas/#/lab/regresion).

Con una sesión de clasificación compatible, interpreta validación: identifica ejes y un error de la matriz de confusión. Predice el efecto de bajar el umbral binario. Para regresión usa un ejemplo numérico compatible, conservando antes tu sesión, y explica un residuo y las unidades de MSE frente a MAE. Si falta una sesión compatible, registra el requisito y prepárala con ayuda; no inventes resultados.

Evidencia: un cálculo con su denominador y un residuo. Explica por qué una probabilidad alta no demuestra calibración y por qué R² no es una probabilidad.

## A09 · Regiones de decisión · L13/L14

[Dos clases](https://franmatias.github.io/neural-atlas/#/lab/arquitectura/frontera) · [Multiclase](https://franmatias.github.io/neural-atlas/#/lab/clasificacion/visual).

En dos lunas, distingue puntos etiquetados, fondo y frontera. Entrena con un presupuesto acotado y prueba una entrada. En multiclase coloca una sonda cerca de una frontera y compara probabilidades. Predice qué cambiaría si añades ruido o un ejemplo contradictorio; modifica un solo factor y observa.

Evidencia: etiqueta real frente a predicción, salida por clase y descripción de una zona ambigua. Una región muy segura lejos de los datos no demuestra conocimiento fiable.

## A10 · Del píxel al mapa · L11

[Abrir Visión](https://franmatias.github.io/neural-atlas/#/lab/vision).

Aplica un kernel identidad y después uno de borde. Predice el valor de una ventana antes de ejecutarla. Cambia stride o padding y explica las dimensiones. Distingue estas operaciones de entrenar una CNN.

Evidencia: productos y suma de una ventana, dimensiones antes/después y descripción del efecto del filtro.

## A11 · Comparar con condiciones comunes · L12

[Abrir Experimentos](https://franmatias.github.io/neural-atlas/#/lab/experimentos).

Formula una hipótesis y cambia un único factor. Usa un ejemplo pequeño de dos características y el mismo protocolo en ambas condiciones. Compara evidencia de validación; si repites semillas, conserva todas. No selecciones por test. Identifica si el resultado observado apoya, contradice o no permite resolver tu hipótesis.

Evidencia: qué cambió, qué permaneció fijo, métrica y limitación. Algunos estudios acotados admiten como máximo ocho columnas crudas: un rechazo de Wine completo no implica que se hayan descartado columnas silenciosamente.

## A12 · Explicar y conservar evidencia

[Abrir Glosario](https://franmatias.github.io/neural-atlas/#/glosario).

Elige un concepto que antes confundías y explica un ejemplo nuevo con tus palabras. Relaciónalo con una observación del laboratorio. Conserva el cuaderno o una exportación y describe qué incluye: ajustes, pesos, datos o evidencia, según el tipo de archivo. No asumas que visitar una ficha demuestra dominarla.

Evidencia: explicación breve, observación que la respalda y una duda pendiente. Revisa que el material compartido no contenga información identificativa.

## Cierre

¿Qué gráfico o control te ayudó más? ______

¿Dónde no sabías cómo continuar? ______

¿Qué explicación te resultó confusa y cómo la reformularías? ______

¿Qué puedes explicar ahora y qué necesitarías practicar? ______
