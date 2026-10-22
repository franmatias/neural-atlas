export interface Concept {
  id: string;
  title: string;
  english: string;
  aliases: string[];
  definition: string;
  formula: string;
  question: string;
  answer: string;
}
export const concepts: readonly Concept[] = [
  {
    id: 'C011',
    title: 'Vector de características',
    english: 'Feature vector',
    aliases: ['features', 'entrada'],
    definition:
      'Una colección ordenada de valores que describe una muestra. El orden y la escala de sus componentes importan.',
    formula: 'x = [x₁, x₂]',
    question: '¿Cambiar el orden de las entradas conserva siempre la salida?',
    answer: 'No. Cada posición está asociada a su propio peso.',
  },
  {
    id: 'C020',
    title: 'Datos de entrada',
    english: 'Inputs',
    aliases: ['input'],
    definition:
      'Los valores que recibe la neurona para calcular su salida. Aquí puedes modificarlos sin cambiar los pesos.',
    formula: 'x₁ = 0,8; x₂ = 0,2',
    question: '¿Mover una entrada equivale a entrenar?',
    answer: 'No. Entrenar ajusta parámetros a partir de datos y una función objetivo.',
  },
  {
    id: 'C021',
    title: 'Neurona artificial',
    english: 'Artificial neuron',
    aliases: ['unidad'],
    definition:
      'Combina entradas con pesos, suma un sesgo y aplica una activación. Su cálculo es explícito; no implica intención ni comprensión.',
    formula: 'a = f(w₁x₁ + w₂x₂ + b)',
    question: '¿La salida activada siempre coincide con la suma?',
    answer: 'Solo cuando la activación es lineal. En general a = f(z).',
  },
  {
    id: 'C022',
    title: 'Perceptrón',
    english: 'Perceptron',
    aliases: ['escalon'],
    definition:
      'Una unidad con regla de decisión por umbral. Su frontera lineal limita los problemas que puede resolver. Su regla de aprendizaje llegará con L03.',
    formula: 'ŷ = 1 si z ≥ 0; 0 si z < 0',
    question: '¿Su frontera puede dibujar cualquier forma?',
    answer: 'No. Una única suma afín define una frontera lineal.',
  },
  {
    id: 'C027',
    title: 'Pesos',
    english: 'Weights',
    aliases: ['weight', 'sinapticos'],
    definition:
      'Multiplican las entradas. Un peso negativo invierte su contribución; su magnitud depende de la escala de los datos y no demuestra importancia causal.',
    formula: 'contribuciónᵢ = wᵢxᵢ',
    question: '¿Un peso mayor implica siempre una feature más importante?',
    answer: 'No. La escala, las correlaciones y el resto del modelo también influyen.',
  },
  {
    id: 'C028',
    title: 'Sesgo',
    english: 'Bias',
    aliases: ['b', 'intercepto'],
    definition:
      'Se añade a la suma ponderada. Si los pesos se mantienen, desplaza la frontera sin cambiar su orientación.',
    formula: 'z = w·x + b',
    question: '¿Qué ocurre si todos los pesos son cero?',
    answer:
      'z = b para cualquier entrada: la salida es constante y no hay una recta de frontera definida.',
  },
  {
    id: 'C039',
    title: 'Función de activación',
    english: 'Activation function',
    aliases: ['activation'],
    definition:
      'Transforma la suma z en la salida a. Las activaciones no lineales permiten construir representaciones que no son una única transformación lineal.',
    formula: 'a = f(z)',
    question: '¿Añadir capas lineales basta para crear una frontera no lineal?',
    answer: 'No. Una composición de transformaciones afines sigue siendo afín.',
  },
  {
    id: 'C041',
    title: 'Sigmoide',
    english: 'Sigmoid',
    aliases: ['logistica'],
    definition:
      'Convierte un escalar en un valor entre 0 y 1. Cerca de sus extremos se satura y su derivada se hace pequeña.',
    formula: 'σ(z) = 1 / (1 + exp(−z))',
    question: '¿Cuánto vale en z = 0?',
    answer:
      '0,5; ese valor corresponde a la frontera z = 0 en clasificación binaria con umbral 0,5.',
  },
  {
    id: 'C042',
    title: 'Tangente hiperbólica',
    english: 'Tanh',
    aliases: ['tangente'],
    definition:
      'Activación continua con salidas entre −1 y 1, centrada en cero. También puede saturarse.',
    formula: 'f(z) = tanh(z)',
    question: '¿Su salida es una probabilidad?',
    answer: 'No: puede tomar valores negativos.',
  },
  {
    id: 'C043',
    title: 'ReLU',
    english: 'Rectified linear unit',
    aliases: ['rectificada'],
    definition:
      'Mantiene los valores positivos y convierte los negativos en cero. Aquí su derivada en cero se fija convencionalmente en cero.',
    formula: 'ReLU(z) = max(0,z)',
    question: '¿Qué salida produce con z = −2?',
    answer: 'Cero; su derivada también es cero en valores negativos.',
  },
  {
    id: 'C044',
    title: 'Leaky ReLU',
    english: 'Leaky ReLU',
    aliases: ['pendiente negativa'],
    definition:
      'Conserva una pequeña pendiente para entradas negativas. En este laboratorio α = 0,01.',
    formula: 'f(z) = z si z > 0; 0,01z en otro caso',
    question: '¿Su salida negativa es siempre cero?',
    answer: 'No. Para z = −2 produce −0,02 con α = 0,01.',
  },
  {
    id: 'C046',
    title: 'Función escalón',
    english: 'Step function',
    aliases: ['step', 'umbral'],
    definition:
      'Produce una decisión binaria y tiene una discontinuidad en cero. No se usa como activación entrenable mediante backprop en este proyecto.',
    formula: 'step(z) = 1 si z ≥ 0; 0 en otro caso',
    question: '¿El punto de salto tiene una derivada ordinaria?',
    answer: 'No; por eso no se trata como una activación suave entrenable por retropropagación.',
  },
  {
    id: 'C049',
    title: 'Suma ponderada',
    english: 'Weighted sum',
    aliases: ['producto', 'z'],
    definition:
      'Suma las contribuciones de las entradas y el sesgo antes de activar. El inspector mantiene separados z y a.',
    formula: 'z = Σᵢ wᵢxᵢ + b',
    question: '¿Cuánto vale con el preset inicial?',
    answer: '0,5×0,8 − 0,3×0,2 + 0,1 = 0,44.',
  },
  {
    id: 'C050',
    title: 'Predicción',
    english: 'Output prediction',
    aliases: ['output', 'salida'],
    definition:
      'El resultado de aplicar el modelo a una entrada. Su significado depende de la tarea y de la función de salida elegida.',
    formula: 'a = f(z)',
    question: '¿Toda salida entre cero y uno está calibrada?',
    answer:
      'No. Estar en ese intervalo no garantiza que las probabilidades correspondan a frecuencias observadas.',
  },
  {
    id: 'C017',
    title: 'Frontera de decisión',
    english: 'Decision boundary',
    aliases: ['frontera'],
    definition:
      'Separa regiones que reciben decisiones distintas. Aquí se representa z = 0; con sigmoide coincide con p = 0,5.',
    formula: 'w₁x₁ + w₂x₂ + b = 0',
    question: '¿Cambiar b gira la frontera?',
    answer: 'Si los pesos no cambian y no son ambos cero, cambia su posición, no su orientación.',
  },
];
export function searchConcepts(query: string): readonly Concept[] {
  const normalize = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  const needle = normalize(query);
  return concepts.filter((c) =>
    normalize([c.id, c.title, c.english, ...c.aliases, c.definition].join(' ')).includes(needle),
  );
}
