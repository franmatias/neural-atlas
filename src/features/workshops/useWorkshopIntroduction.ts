import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { DataClient } from '@/infrastructure/workers/data-client';
import { defaultWorkshopOptions, type WorkshopEvidence } from '@/application/workshops/contracts';
import { introductionSteps, type IntroductionPrediction } from '@/content/workshop-introduction';
import { appVersion } from '@/shared/version';

export function useWorkshopIntroduction() {
  const client = new DataClient();
  const mode = ref<'guided' | 'solved'>('guided'),
    step = ref(0),
    unlocked = ref(0);
  const prediction = ref<IntroductionPrediction>(''),
    hypothesis = ref(''),
    reflection = ref('');
  const bias = ref(0.5),
    evidence = shallowRef<WorkshopEvidence>(),
    reference = shallowRef<WorkshopEvidence>();
  const busy = ref(false),
    error = ref(''),
    notice = ref(''),
    completed = ref(false);
  let revision = 0;
  const displayed = computed(() => (mode.value === 'solved' ? reference.value : evidence.value));
  const canNext = computed(
    () =>
      !busy.value &&
      step.value < 4 &&
      (step.value !== 0 || !!prediction.value) &&
      (step.value < 2 || !!evidence.value),
  );
  function go(index: number) {
    if (busy.value || !Number.isInteger(index) || index < 0 || index > unlocked.value || index > 4)
      return false;
    step.value = index;
    return true;
  }
  function next() {
    if (!canNext.value) return false;
    unlocked.value = Math.max(unlocked.value, step.value + 1);
    step.value++;
    return true;
  }
  function cancel() {
    revision++;
    client.cancel();
    busy.value = false;
    notice.value =
      'Intento cancelado. Se conserva el resultado anterior si ya existía para estos ajustes.';
  }
  async function run(target: 'guided' | 'solved' = 'guided') {
    if (busy.value) return false;
    if (target === 'guided' && step.value !== 2) return false;
    const value = target === 'solved' ? 0.5 : bias.value;
    if (!Number.isFinite(value) || value < -1 || value > 1) {
      error.value = 'Elige un sesgo entre −1 y 1.';
      return false;
    }
    const token = ++revision;
    busy.value = true;
    error.value = '';
    notice.value = '';
    try {
      const result = await client.run('workshop', {
        caseId: 'T02',
        options: { ...defaultWorkshopOptions, bias: value },
      });
      if (token !== revision) return false;
      if (target === 'solved') reference.value = result;
      else evidence.value = result;
      notice.value =
        target === 'solved'
          ? 'Ejemplo resuelto calculado con b=0,5. Tus notas y tu experimento propio se conservan.'
          : 'Caso ejecutado. La evidencia describe esta configuración; no es una nota.';
      return true;
    } catch {
      if (token === revision)
        error.value =
          'No se pudo ejecutar el ejemplo. Puedes reintentarlo; se conserva el recorrido y el resultado anterior, si existía.';
      return false;
    } finally {
      if (token === revision) busy.value = false;
    }
  }
  async function showSolved() {
    if (busy.value) return;
    mode.value = 'solved';
    if (!reference.value) await run('solved');
    else
      notice.value =
        'Ejemplo resuelto con b=0,5. Se muestra su evidencia de referencia ya calculada.';
  }
  function showGuided() {
    if (!busy.value) {
      mode.value = 'guided';
      error.value = '';
      notice.value = evidence.value
        ? 'Has vuelto a tu recorrido: se conserva tu resultado propio.'
        : 'Tu recorrido está listo: el resultado del ejemplo resuelto no cuenta como una ejecución propia.';
    }
  }
  watch(
    bias,
    () => {
      if (busy.value) cancel();
      error.value = '';
      evidence.value = undefined;
      completed.value = false;
      unlocked.value = Math.min(unlocked.value, 1);
      if (step.value > 1) step.value = 1;
      notice.value = 'Sesgo cambiado: ejecuta de nuevo para obtener evidencia de estos ajustes.';
    },
    { flush: 'sync' },
  );
  const feedback = computed(() => {
    if (!evidence.value) return '';
    const unchanged = evidence.value.options.bias === 0;
    if (prediction.value === (unchanged ? 'same' : 'shift'))
      return 'Tu predicción coincide con la observación. Ahora justifícala con los valores.';
    return unchanged
      ? 'Con b=0 en ambos casos no cambia la frontera. Una predicción distinta también sirve para aprender: revisa qué factor varió realmente.'
      : 'La recta se desplaza sin girar: los pesos siguen siendo los mismos. Revisa tu predicción; equivocarse aquí no bloquea el recorrido.';
  });
  function finish() {
    if (busy.value || step.value !== 4 || !evidence.value) return false;
    completed.value = true;
    return true;
  }
  function restart() {
    if (busy.value) return;
    step.value = 0;
    unlocked.value = 0;
    completed.value = false;
    notice.value = 'Has vuelto al primer paso; tus notas y el resultado anterior se conservan.';
  }
  function report() {
    if (!displayed.value) throw Error('NO_INTRODUCTION_EVIDENCE');
    return {
      format: 'neural-atlas.workshop-demo',
      schemaVersion: 1,
      appVersion,
      mode: mode.value,
      completed: mode.value === 'guided' && completed.value,
      exampleSource: 'provided-worked-example',
      workedExample: introductionSteps.map((s) => ({ phase: s.title, answer: s.worked })),
      learner: {
        prediction: prediction.value,
        hypothesis: hypothesis.value,
        reflection: reflection.value,
      },
      evidence: displayed.value,
    };
  }
  onScopeDispose(() => {
    revision++;
    client.cancel();
  });
  return {
    mode,
    step,
    unlocked,
    prediction,
    hypothesis,
    reflection,
    bias,
    evidence,
    reference,
    displayed,
    busy,
    error,
    notice,
    completed,
    canNext,
    feedback,
    go,
    next,
    cancel,
    run,
    showSolved,
    showGuided,
    finish,
    restart,
    report,
  };
}
