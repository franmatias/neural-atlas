import type { RecipeId, GeneratorOptions } from '@/domain/data/types';
export const datasetRecipes: readonly { id: RecipeId; title: string; description: string }[] = [
  {
    id: 'clouds',
    title: 'Dos nubes',
    description: 'Dos clases alrededor de centros separados. El ruido puede hacer que se solapen.',
  },
  {
    id: 'moons',
    title: 'Dos lunas',
    description: 'Dos arcos entrelazados: una frontera lineal suele ser insuficiente.',
  },
  {
    id: 'circles',
    title: 'Círculos concéntricos',
    description:
      'Una clase interior y otra exterior. La distancia al centro organiza las etiquetas.',
  },
  {
    id: 'xor',
    title: 'XOR por cuadrantes',
    description:
      'El signo del producto distingue las clases; una única recta no separa los cuatro cuadrantes.',
  },
  {
    id: 'spirals',
    title: 'Espirales',
    description: 'Dos brazos alternos. Añadir complejidad no corrige automáticamente el ruido.',
  },
  {
    id: 'flowers',
    title: 'Flores simuladas y categorías',
    description:
      'Tres nubes y una zona categórica independiente de la clase. Son datos ficticios; no es el dataset Iris.',
  },
  {
    id: 'energy',
    title: 'Consumo energético sintético',
    description:
      'Consumo = 40 + 0,035·superficie + 2·ocupación, más ruido en el objetivo. Unidades distintas para comparar el escalado; no es un modelo físico.',
  },
  {
    id: 'sine',
    title: 'Regresión sinusoidal',
    description: 'Objetivo = sin(πx₁) + 0,25x₂, más ruido. La salida es numérica, no una clase.',
  },
];
export const datasetScenarios: readonly {
  id: string;
  title: string;
  options: Partial<GeneratorOptions>;
}[] = [
  {
    id: 'healthy',
    title: 'Sin fallos añadidos',
    options: {
      recipe: 'clouds',
      count: 300,
      noise: 0.08,
      outliers: 0,
      labelNoise: 0,
      missing: 0,
      duplicates: 0,
      minority: 0.5,
    },
  },
  {
    id: 'imbalance',
    title: '95% frente a 5%',
    options: {
      recipe: 'clouds',
      count: 1000,
      minority: 0.05,
      noise: 0.08,
      outliers: 0,
      labelNoise: 0,
      missing: 0,
      duplicates: 0,
    },
  },
  {
    id: 'units',
    title: 'Unidades distintas y atípicos',
    options: {
      recipe: 'energy',
      count: 300,
      noise: 0.08,
      outliers: 0.1,
      labelNoise: 0,
      missing: 0,
      duplicates: 0,
      minority: 0.5,
    },
  },
  {
    id: 'copies',
    title: 'Copias que no deben cruzar conjuntos',
    options: {
      recipe: 'clouds',
      count: 300,
      noise: 0.08,
      duplicates: 0.2,
      missing: 0.1,
      labelNoise: 0,
      outliers: 0,
      minority: 0.5,
    },
  },
];
