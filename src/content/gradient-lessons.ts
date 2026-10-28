import type { LandscapeOptions } from '@/application/training/landscape';
export const gradientLessons: {
  id: string;
  title: string;
  question: string;
  explanation: string;
  patch: Partial<LandscapeOptions>;
}[] = [
  {
    id: 'first-step',
    title: '1. Un paso que puedes calcular',
    question: 'Desde (1,1), con tasa 0,1, ¿hacia dónde se moverá SGD?',
    explanation:
      'En L=x²+3y², el gradiente es (2x,6y). En (1,1) vale (2,6): restar 0,1 veces ese vector da (0,8;0,4). La pérdida baja de 4 a 1,12. La altura 3D cae y el punto 2D cruza contornos hacia valores menores.',
    patch: { mode: 'illustrative', kind: 'bowl', start: [1, 1], rate: 0.1, clip: 0, steps: 40 },
  },
  {
    id: 'oscillation',
    title: '2. Oscilar mientras se desciende',
    question: '¿Puede bajar la pérdida aunque una coordenada cambie de signo en cada paso?',
    explanation:
      'Con tasa 0,32, y se multiplica por −0,92. Cambia de signo, pero su magnitud disminuye. La vista superior muestra el zigzag y la altura 3D su descenso. Para este cuenco, SGD converge con 0<η<1/3; esta cota no vale para cualquier función ni optimizador.',
    patch: { mode: 'illustrative', kind: 'bowl', start: [1, 1], rate: 0.32, clip: 0, steps: 60 },
  },
  {
    id: 'divergence',
    title: '3. Un paso demasiado largo',
    question: '¿Qué cambia al subir la tasa de SGD a 0,5?',
    explanation:
      'Ahora y se multiplica por −2: su magnitud crece. SGD puede subir por la superficie y salir del dominio. El cálculo se detiene al salir, conserva el intento rechazado y no recorta el punto para fingir convergencia. La misma tasa no es igual de apropiada para Adam o RMSprop.',
    patch: { mode: 'illustrative', kind: 'bowl', start: [1, 1], rate: 0.5, clip: 0, steps: 30 },
  },
  {
    id: 'saddle',
    title: '4. Gradiente cero sin mínimo',
    question: 'En (0,0), ¿pararse demuestra que ya no hay pérdidas menores?',
    explanation:
      'Para L=x²−y², el gradiente en el origen es cero. La superficie sube en x y baja en y: es una silla, no un mínimo. El corte 2D y la malla 3D ayudan a distinguir direcciones. Después prueba iniciar en (0,1;0,1).',
    patch: { mode: 'illustrative', kind: 'saddle', start: [0, 0], rate: 0.1, clip: 0, steps: 40 },
  },
  {
    id: 'valley',
    title: '5. Un valle estrecho',
    question: '¿Por qué una tasa pequeña puede seguir avanzando muy despacio?',
    explanation:
      'En Rosenbrock hay direcciones de curvatura muy distinta. Evitar pasos inestables no elimina el avance lento por el valle. Compara recorridos y gradientes en el mismo índice; clipping limita la norma del gradiente y modifica la propuesta, pero no demuestra que se encuentre el mínimo global.',
    patch: {
      mode: 'illustrative',
      kind: 'rosenbrock',
      start: [-1.2, 1],
      rate: 0.001,
      clip: 0,
      steps: 100,
    },
  },
];
