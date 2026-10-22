import { defaultNeuron, type NeuronConfig } from '@/domain/network/neuron';
export const neuronPresets: readonly { id: string; title: string; config: NeuronConfig }[] = [
  { id: 'first', title: '01 · Un primer cálculo', config: { ...defaultNeuron } },
  { id: 'bias', title: '02 · El sesgo desplaza', config: { ...defaultNeuron, b: 1 } },
  { id: 'inverse', title: '03 · Un peso invierte', config: { ...defaultNeuron, w1: -1, w2: 0.5 } },
  {
    id: 'relu',
    title: '04 · ReLU y el cero',
    config: { ...defaultNeuron, w1: -1, w2: -1, b: 0, activation: 'relu' },
  },
  {
    id: 'constant',
    title: '05 · Sin entradas influyentes',
    config: { ...defaultNeuron, w1: 0, w2: 0, b: 0.5 },
  },
];
