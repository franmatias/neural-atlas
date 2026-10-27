import { computed, onScopeDispose, ref, shallowRef } from 'vue';
import { defineStore } from 'pinia';
import { DataClient } from '@/infrastructure/workers/data-client';
import {
  imagePattern,
  kernelPattern,
  rotateImage,
  inspectWindow,
  visionShape,
  type VisionInput,
  type VisionResult,
  type ImagePattern,
} from '@/domain/network/vision';
import { exportVision } from '@/application/training/vision';
export const useVisionStore = defineStore('vision', () => {
  const options = ref<VisionInput>({
    size: 10,
    pixels: imagePattern(10, 'seven'),
    kernelSize: 3,
    kernel: kernelPattern(3, 'edge'),
    stride: 1,
    padding: 'same',
    relu: true,
  });
  const result = shallowRef<VisionResult>(),
    busy = ref(false),
    error = ref(''),
    notice = ref(''),
    index = ref(0),
    poolIndex = ref(0),
    hypothesis = ref(''),
    recordedHypothesis = ref(''),
    reflection = ref('');
  const count = computed(() => (result.value ? result.value.raw.length : 0)),
    inspector = computed(() =>
      result.value ? inspectWindow(result.value.input, index.value) : undefined,
    );
  const shape = computed(() => {
    try {
      return visionShape(options.value);
    } catch {
      return undefined;
    }
  });
  const client = new DataClient();
  let sequence = 0;
  function pattern(kind: ImagePattern) {
    if (!busy.value) options.value.pixels = imagePattern(options.value.size, kind);
  }
  function resize(size: number) {
    if (busy.value || !Number.isInteger(size) || size < 10 || size > 28) return;
    options.value.size = size;
    options.value.pixels = imagePattern(size, 'seven');
  }
  function kernel(size: number, kind: 'identity' | 'mean' | 'edge') {
    if (busy.value) return;
    options.value.kernelSize = size;
    options.value.kernel = kernelPattern(size, kind);
  }
  function paint(row: number, column: number, value: number) {
    if (
      busy.value ||
      ![row, column].every((v) => Number.isInteger(v) && v >= 0 && v < options.value.size) ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > 1
    )
      return;
    options.value.pixels[row * options.value.size + column] = value;
  }
  function rotate() {
    if (!busy.value) options.value.pixels = rotateImage(options.value.pixels, options.value.size);
  }
  function clear() {
    if (!busy.value) options.value.pixels.fill(0);
  }
  function cancel() {
    sequence++;
    client.cancel();
    busy.value = false;
    notice.value = 'Cálculo cancelado. Se conserva el último mapa completo.';
  }
  async function run() {
    if (busy.value) return;
    const id = ++sequence,
      prediction = hypothesis.value.slice(0, 2000);
    busy.value = true;
    error.value = '';
    notice.value = '';
    try {
      const done = await client.run('vision', {
        ...options.value,
        pixels: [...options.value.pixels],
        kernel: [...options.value.kernel],
      });
      if (id !== sequence) return;
      result.value = done;
      index.value = 0;
      poolIndex.value = 0;
      recordedHypothesis.value = prediction;
      reflection.value = '';
      notice.value = 'Mapas registrados. Editar el borrador no cambia estos resultados.';
    } catch {
      if (id === sequence)
        error.value =
          'No se completó el mapa. Revisa dimensiones y valores de imagen/filtro. Se conserva el anterior.';
    } finally {
      if (id === sequence) busy.value = false;
    }
  }
  function report() {
    if (!result.value) throw Error('NO_RESULT');
    return exportVision(
      result.value,
      index.value,
      poolIndex.value,
      recordedHypothesis.value,
      reflection.value,
    );
  }
  onScopeDispose(() => client.cancel());
  return {
    options,
    result,
    busy,
    error,
    notice,
    index,
    poolIndex,
    hypothesis,
    recordedHypothesis,
    reflection,
    count,
    inspector,
    shape,
    pattern,
    resize,
    kernel,
    paint,
    rotate,
    clear,
    cancel,
    run,
    report,
  };
});
