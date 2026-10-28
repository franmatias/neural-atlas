# Cuestionarios inicial y final

Código: ______ · Sesión: ______ · Momento (pre/post): ______ · Forma (A/B): ______

Tiempo orientativo: diez minutos. Contesta sin consultar la solución. Puedes escribir «no lo sé»; distingue una respuesta de una duda. Cada pregunta pide resultado y razón breve. El docente usa una forma antes y la otra después y registra el orden. Son instrumentos formativos propuestos, no una prueba estandarizada.

## Forma A

1. Una neurona lineal usa x=2, w=0,5 y b=1. ¿Cuánto vale z=wx+b? ¿Ese cálculo con parámetros elegidos a mano equivale por sí solo a entrenar con datos?
2. ¿Por qué apilar capas afines sin activación no lineal no permite separar XOR con una frontera no lineal?
3. Dos logits son iguales: [0,0]. ¿Qué probabilidades produce softmax? ¿Eso demuestra alta confianza en una clase?
4. Para L=x²+3y², parte de (1,1), usa gradiente (2,6) y tasa 0,1. Calcula el siguiente punto SGD y su pérdida. ¿Por qué se resta el gradiente?
5. En L=x²−y², el gradiente en (0,0) es cero. ¿Es necesariamente un mínimo? Justifica con un punto próximo.
6. El rango de train es [10,30]. ¿Cuál es el Min-Max de 40 en validación? ¿Reajustarías el rango con validación? Explica.
7. Una clase tiene TP=8, FP=2 y FN=4. Calcula precision y recall e indica sus denominadores.
8. Después de entrenar, deshaces la configuración. ¿Recuperas necesariamente los pesos y momentos anteriores? ¿Qué recurso permite recuperar ese estado?

Respuestas A1–A8: ______

## Forma B

1. Una neurona lineal usa x=3, w=−0,5 y b=2. ¿Cuánto vale z=wx+b? ¿Ese cálculo con parámetros elegidos a mano equivale por sí solo a entrenar con datos?
2. Tres capas afines sin activaciones no lineales, ¿pueden expresar una frontera no lineal para XOR? Explica qué transformación equivale a su composición.
3. Dos logits son iguales: [5,5]. ¿Qué probabilidades produce softmax? ¿El valor 5 demuestra que una clase es más fiable que la otra?
4. Para L=x²+3y², parte de (0,5;1), usa gradiente (1,6) y tasa 0,1. Calcula el siguiente punto SGD y su pérdida. ¿Por qué se resta el gradiente?
5. En L=x²−y², una ejecución se detiene en el origen por gradiente cero. ¿Ha demostrado que no existen pérdidas menores? Justifica con un punto próximo.
6. El rango de train es [0,20]. ¿Cuál es el Min-Max de 30 en validación? ¿Reajustarías el rango con validación? Explica.
7. Una clase tiene TP=6, FP=2 y FN=6. Calcula precision y recall e indica sus denominadores.
8. Quieres recuperar una red y su optimizador justo antes de cambiar ajustes. ¿Basta con rehacer/deshacer ajustes? ¿Qué necesitas guardar o recuperar?

Respuestas B1–B8: ______
