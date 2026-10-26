export interface Laboratory {
  id: string;
  slug: string;
  title: string;
  question: string;
  group: 'foundations' | 'learning' | 'practice';
  phase: string;
  available: boolean;
}
export const laboratories: readonly Laboratory[] = [
  {
    id: 'L01',
    slug: 'datos',
    title: 'Datos antes que modelos',
    question: '¿Qué puede aprender un modelo de datos defectuosos?',
    group: 'foundations',
    phase: 'D2',
    available: true,
  },
  {
    id: 'L02',
    slug: 'neurona',
    title: 'Una neurona',
    question: '¿Cómo se transforma una entrada en una salida?',
    group: 'foundations',
    phase: 'D1',
    available: true,
  },
  {
    id: 'L03',
    slug: 'arquitectura',
    title: 'Arquitectura y XOR',
    question: '¿Por qué una sola recta no siempre es suficiente?',
    group: 'foundations',
    phase: 'D3',
    available: true,
  },
  {
    id: 'L04',
    slug: 'activaciones',
    title: 'Activación y gradientes',
    question: '¿Qué aporta la no linealidad?',
    group: 'foundations',
    phase: 'D3',
    available: true,
  },
  {
    id: 'L05',
    slug: 'propagacion',
    title: 'Del cálculo al gradiente',
    question: '¿Cómo se reparte el error entre los pesos?',
    group: 'learning',
    phase: 'D3',
    available: true,
  },
  {
    id: 'L06',
    slug: 'entrenamiento',
    title: 'Entrenar con criterio',
    question: '¿Qué cambia al ajustar la tasa o el lote?',
    group: 'learning',
    phase: 'D4',
    available: true,
  },
  {
    id: 'L07',
    slug: 'optimizacion',
    title: 'Paisajes de pérdida',
    question: '¿Qué camino sigue cada optimizador?',
    group: 'learning',
    phase: 'D9',
    available: false,
  },
  {
    id: 'L08',
    slug: 'generalizacion',
    title: 'Aprender sin memorizar',
    question: '¿Mejorar en train significa generalizar?',
    group: 'learning',
    phase: 'D6',
    available: true,
  },
  {
    id: 'L09',
    slug: 'clasificacion',
    title: 'Clasificar y evaluar',
    question: '¿Qué esconden los aciertos de un clasificador?',
    group: 'practice',
    phase: 'D4',
    available: true,
  },
  {
    id: 'L10',
    slug: 'regresion',
    title: 'Regresión y residuos',
    question: '¿Cómo se mide una predicción numérica?',
    group: 'practice',
    phase: 'D4',
    available: true,
  },
  {
    id: 'L11',
    slug: 'vision',
    title: 'Del píxel al mapa',
    question: '¿Qué ve un filtro al recorrer una imagen?',
    group: 'practice',
    phase: 'D9',
    available: false,
  },
  {
    id: 'L12',
    slug: 'experimentos',
    title: 'Laboratorio de hipótesis',
    question: '¿Qué evidencia respalda tu explicación?',
    group: 'practice',
    phase: 'D7',
    available: true,
  },
];
export function findLaboratory(slug: string) {
  return laboratories.find((lab) => lab.slug === slug);
}
