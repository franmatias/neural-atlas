export const introductionSteps = [
  {
    title: 'Predecir',
    question: '¿Qué pasará al cambiar solo el sesgo de una neurona?',
    coach:
      'En el taller real escribe «Tu hipótesis antes de observar» y pulsa «Validar paso y continuar». El mínimo de caracteres evita respuestas vacías; no determina si son correctas. No necesitas acertar la predicción.',
    worked:
      'Mantendré w₁=1 y w₂=0,5. Predigo que al pasar b de 0 a 0,5 la recta se desplazará sin girar, porque los pesos fijan su orientación.',
  },
  {
    title: 'Configurar',
    question: '¿Qué cambia y qué permanece fijo?',
    coach:
      'Elige opciones y explica «Qué varías y qué mantienes constante». Modifica un factor para interpretar su efecto. Revisa datos, split, semilla y presupuesto cuando corresponda; después valida el paso.',
    worked:
      'Referencia: w=(1;0,5), b=0. Variante resuelta: los mismos pesos y b=0,5. Los puntos son nubes sintéticas de referencia, con semilla 42.',
  },
  {
    title: 'Ejecutar',
    question: '¿Cómo obtengo evidencia?',
    coach:
      'En el taller real pulsa «Ejecutar caso con el motor» y espera su evidencia. Una hipótesis escrita o una animación por sí solas no constituyen una medida. Si cancelas, no presentes ese intento como resultado completado.',
    worked:
      'Ejecuto el caso T02 con el motor del simulador. Calcula las dos configuraciones y el desplazamiento de sus fronteras; no aprende pesos ni calcula accuracy.',
  },
  {
    title: 'Observar',
    question: '¿Qué muestran el dibujo y la tabla?',
    coach:
      'Lee gráfico y tabla; después escribe «Tu observación contrastada» y valida el paso. Describe valores antes de interpretarlos. Los estilos de las líneas complementan el color. Puedes usar «Mostrar pista sin penalización».',
    worked:
      'La discontinua cumple x₁+0,5x₂=0; la continua x₁+0,5x₂+0,5=0. Son paralelas. En x₁=0, la intersección pasa de 0 a −1. La distancia perpendicular es 0,5/√1,25≈0,447214.',
  },
  {
    title: 'Explicar',
    question: '¿Cómo redacto una conclusión con evidencia y límites?',
    coach:
      'Escribe «Tu explicación y sus límites», consulta la explicación orientativa si la necesitas y elige una autoevaluación. Pulsa «Registrar reflexión y completar recorrido». El docente valora el razonamiento: completar pantallas no equivale a dominarlo.',
    worked:
      'Mi predicción se sostiene: al conservar w, la normal no cambia y las rectas son paralelas. Cambiar b desplaza la frontera 0,447214 unidades. Esto no demuestra que clasifique mejor las nubes ni que se haya entrenado una red.',
  },
] as const;
export type IntroductionPrediction = '' | 'shift' | 'rotate' | 'same';
