import { computed, onScopeDispose, ref, shallowRef } from 'vue';
import { defineStore } from 'pinia';
import { DataClient } from '@/infrastructure/workers/data-client';
import { auditHistogram } from '@/domain/training/group-audit';
import {
  defaultAuditScenario,
  defaultAuditSettings,
  auditPresets,
  analyzeAudit,
  exportAuditReport,
  type AuditCohort,
  type AuditPreset,
  type AuditScenarioOptions,
  type AuditReflection,
} from '@/application/training/group-audit';
export const useEthicsStore = defineStore('ethics', () => {
  const options = ref<AuditScenarioOptions>({ ...defaultAuditScenario }),
    presetId = ref<AuditPreset>('aggregate');
  const settings = ref(defaultAuditSettings()),
    hypothesis = ref(''),
    recordedHypothesis = ref('');
  const reflection = ref<AuditReflection>({ evidence: '', context: '', action: '' });
  const cohort = shallowRef<AuditCohort>(),
    busy = ref(false),
    error = ref(''),
    notice = ref('');
  const client = new DataClient();
  let sequence = 0;
  const analysis = computed(() =>
    cohort.value ? analyzeAudit(cohort.value, settings.value) : undefined,
  );
  const histograms = computed(() =>
    cohort.value
      ? { G1: auditHistogram(cohort.value.rows, 'G1'), G2: auditHistogram(cohort.value.rows, 'G2') }
      : undefined,
  );
  function preset(id: string) {
    if (busy.value || !Object.hasOwn(auditPresets, id)) return;
    presetId.value = id as AuditPreset;
    options.value = { ...auditPresets[presetId.value] };
  }
  function separate(value: boolean) {
    if (value) {
      settings.value.group1 = settings.value.alternative;
      settings.value.group2 = settings.value.alternative;
    }
    settings.value.separated = value;
  }
  function cancel() {
    sequence++;
    client.cancel();
    busy.value = false;
    notice.value = 'Generación cancelada. Se conserva la última cohorte completa.';
  }
  async function generate() {
    if (busy.value) return;
    const id = ++sequence,
      prediction = hypothesis.value.slice(0, 2000);
    busy.value = true;
    error.value = '';
    notice.value = '';
    try {
      const result = await client.run('groupAudit', { ...options.value });
      if (id !== sequence) return;
      cohort.value = result;
      recordedHypothesis.value = prediction;
      reflection.value = { evidence: '', context: '', action: '' };
      notice.value =
        'Cohorte registrada. Los umbrales y costes comparan decisiones sobre estas mismas filas.';
    } catch {
      if (id === sequence)
        error.value =
          'No se generó la cohorte. Revisa la semilla y los límites: hasta 400 filas por canal y al menos 20 en total. Se conserva la anterior.';
    } finally {
      if (id === sequence) busy.value = false;
    }
  }
  function report() {
    if (!cohort.value) throw new Error('NO_RESULT');
    return exportAuditReport(cohort.value, settings.value, recordedHypothesis.value, {
      ...reflection.value,
    });
  }
  onScopeDispose(() => client.cancel());
  return {
    options,
    presetId,
    settings,
    hypothesis,
    recordedHypothesis,
    reflection,
    cohort,
    busy,
    error,
    notice,
    analysis,
    histograms,
    preset,
    separate,
    cancel,
    generate,
    report,
  };
});
