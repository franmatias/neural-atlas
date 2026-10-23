import { defineStore } from 'pinia';
import { computed, onScopeDispose, ref, shallowRef } from 'vue';
import { workshops } from '@/content/workshops';
import {
  definitionHash,
  importWorkshop,
  exportWorkshop,
  evaluateRule,
  defaultWorkshopOptions,
  optionsSchema,
  type WorkshopDefinition,
} from '@/application/workshops/contracts';
import {
  newProgress,
  validateProgress,
  type WorkshopProgress,
} from '@/application/workshops/progress';
import { WorkshopLibrary, type WorkshopRecord } from '@/infrastructure/storage/workshop-library';
import {
  readWorkshopDrafts,
  removeWorkshopDraft,
  writeWorkshopDraft,
} from '@/infrastructure/persistence/workshop-progress';
import { LibraryError } from '@/infrastructure/storage/database';
import { DataClient } from '@/infrastructure/workers/data-client';
import { appVersion } from '@/shared/version';
import { hashValue } from '@/domain/data/integrity';
export const useWorkshopsStore = defineStore('workshops', () => {
  const library = new WorkshopLibrary(),
    client = new DataClient();
  const catalog = shallowRef<WorkshopDefinition[]>([...workshops]);
  const definition = shallowRef(workshops[0]!);
  const progress = ref<WorkshopProgress>(newProgress(definition.value, defaultWorkshopOptions));
  const records = shallowRef<WorkshopRecord[]>([]);
  const memory = new Map<string, { progress: WorkshopProgress; revision: number }>();
  const busy = ref(false),
    saving = ref(false),
    error = ref(''),
    notice = ref(''),
    storage = ref('Almacenamiento pendiente');
  const step = computed(() => definition.value.steps[progress.value.step]);
  const canDelete = computed(() =>
    records.value.some((record) => record.id === progress.value.definitionHash),
  );
  let initialized = false;
  let sequence = 0,
    revision = 0,
    timer: ReturnType<typeof setTimeout> | undefined;
  function cancel() {
    sequence++;
    client.cancel();
    busy.value = false;
    if (timer) clearTimeout(timer);
  }
  function touch() {
    progress.value.updatedAt = new Date().toISOString();
  }
  function draft() {
    touch();
    if (!writeWorkshopDraft(progress.value))
      storage.value = 'Resumen LocalStorage no disponible; conserva una copia exportada';
  }
  function answer(text: string) {
    if (!step.value) return;
    progress.value.answers[step.value.id] = text.slice(0, 2000);
    if (timer) clearTimeout(timer);
    timer = setTimeout(draft, 400);
  }
  async function persist() {
    if (saving.value) return;
    saving.value = true;
    touch();
    const summary = writeWorkshopDraft(progress.value);
    try {
      const record = await library.save(definition.value, progress.value, revision);
      revision = record.revision;
      records.value = [...records.value.filter((old) => old.id !== record.id), record];
      storage.value = summary
        ? 'Progreso y evidencias guardados en este navegador'
        : 'Evidencias guardadas en IndexedDB; resumen LocalStorage no disponible';
    } catch (caught) {
      storage.value = 'Modo memoria: exporta el cuaderno para conservar las evidencias';
      error.value =
        caught instanceof LibraryError && caught.code === 'CONFLICT'
          ? 'Otra pestaña guardó una revisión distinta. Tu trabajo sigue en memoria: expórtalo antes de recargar. No se ha sobrescrito la otra versión.'
          : 'No se ha guardado el cuaderno en IndexedDB. Se mantiene la versión anterior y puedes exportar el trabajo actual. Los borradores de texto pueden seguir disponibles en LocalStorage.';
    } finally {
      saving.value = false;
    }
  }
  async function open(next: WorkshopDefinition) {
    if (busy.value || saving.value) return;
    if (initialized) {
      draft();
      memory.set(progress.value.definitionHash, { progress: progress.value, revision });
    }
    cancel();
    definition.value = next;
    error.value = '';
    notice.value = '';
    const cached = memory.get(definitionHash(next));
    if (cached) {
      progress.value = cached.progress;
      revision = cached.revision;
      notice.value = 'Recuperado el trabajo de este taller desde la memoria de la sesión.';
      return;
    }
    const record = records.value.find((record) => record.id === definitionHash(next));
    revision = record?.revision ?? 0;
    progress.value = record
      ? validateProgress(next, record.progress)
      : newProgress(next, defaultWorkshopOptions);
    const latestDraft = readWorkshopDrafts().find(
      (old) => old.definitionHash === definitionHash(next),
    );
    if (
      latestDraft &&
      (!record ||
        (latestDraft.updatedAt >= progress.value.updatedAt &&
          latestDraft.step === progress.value.step &&
          (!progress.value.evidence ||
            latestDraft.evidenceRefs.includes(progress.value.evidence.id))))
    ) {
      progress.value.answers = { ...progress.value.answers, ...latestDraft.answers };
      progress.value.hints = [...new Set([...progress.value.hints, ...latestDraft.hints])];
    }
    if (!record && latestDraft)
      notice.value =
        'Recuperadas respuestas de un borrador. Recorre de nuevo los pasos: no se restauran medidas sin su evidencia de IndexedDB.';
  }
  async function load() {
    try {
      records.value = await library.list();
      const known = new Set(workshops.map(definitionHash));
      const all = [
        ...catalog.value,
        ...records.value
          .filter((record) => !known.has(record.id))
          .map((record) => record.definition),
      ];
      catalog.value = Array.from(new Map(all.map((def) => [definitionHash(def), def])).values());
      storage.value = 'Almacenamiento local disponible';
    } catch {
      storage.value = 'Modo memoria: IndexedDB no disponible o registro no válido';
    }
    await open(definition.value);
    initialized = true;
  }
  async function advance() {
    if (!step.value || busy.value || saving.value) return;
    error.value = '';
    try {
      optionsSchema.parse(progress.value.options);
      if (step.value.type === 'execute' && !progress.value.evidence) throw new Error('EVIDENCE');
      if (
        !step.value.rules.every((rule) =>
          evaluateRule(rule, progress.value.answers[step.value!.id] ?? '', progress.value.evidence),
        )
      )
        throw new Error('RULE');
      validateProgress(definition.value, { ...progress.value, step: progress.value.step + 1 });
      progress.value.step++;
      await persist();
    } catch {
      error.value =
        'Revisa las medidas o completa la respuesta con la longitud indicada por esta actividad. También deben ser válidos los controles y debe haberse ejecutado el caso. Esta comprobación no evalúa la calidad de tu explicación.';
    }
  }
  async function execute() {
    if (step.value?.type !== 'execute' || busy.value || saving.value || progress.value.evidence)
      return;
    const token = ++sequence;
    busy.value = true;
    error.value = '';
    try {
      const options = optionsSchema.parse(progress.value.options);
      const evidence = await client.run('workshop', { caseId: definition.value.caseId, options });
      if (token !== sequence) return;
      progress.value.evidence = evidence;
      notice.value = 'Ejecución registrada con el motor. Contrasta las medidas con tu hipótesis.';
      await persist();
    } catch {
      if (token === sequence)
        error.value =
          'No se ha completado la ejecución. Revisa los controles y, en T05, reconoce el presupuesto de seis ensayos. Se necesita un navegador con Web Workers.';
    } finally {
      if (token === sequence) busy.value = false;
    }
  }
  async function hint() {
    if (!step.value || saving.value) return;
    const key = `${step.value.id}:0`;
    if (!progress.value.hints.includes(key)) progress.value.hints.push(key);
    await persist();
  }
  async function solution() {
    if (step.value?.type !== 'explain' || !step.value.solution || saving.value) return;
    if (!progress.value.solutions.includes(step.value.id))
      progress.value.solutions.push(step.value.id);
    await persist();
  }
  async function retry() {
    if (busy.value || saving.value) return;
    if (progress.value.attempts.length >= 10) {
      error.value =
        'Has alcanzado diez intentos archivados. Exporta el cuaderno; no se eliminan intentos automáticamente.';
      return;
    }
    const old = validateProgress(definition.value, progress.value);
    progress.value = {
      ...newProgress(definition.value, optionsSchema.parse(old.options)),
      attempts: [
        ...old.attempts,
        {
          answers: old.answers,
          hints: old.hints,
          ...(old.evidence ? { evidence: old.evidence } : {}),
          selfScore: old.selfScore,
          endedAt: new Date().toISOString(),
        },
      ],
    };
    await persist();
  }
  async function importDefinition(text: string) {
    if (busy.value || saving.value) throw new Error('WORKSHOP_BUSY');
    const next = importWorkshop(text),
      key = definitionHash(next);
    if (!catalog.value.some((def) => definitionHash(def) === key))
      catalog.value = [...catalog.value, next];
    await open(next);
    await persist();
  }
  function exportDefinition(solutions: boolean) {
    return exportWorkshop(definition.value, solutions);
  }
  function portfolio() {
    const value = {
      format: 'neural-atlas.learning-evidence',
      schemaVersion: 1,
      appVersion,
      exportedAt: new Date().toISOString(),
      definition: definition.value,
      progress: validateProgress(definition.value, progress.value),
      assessment: 'Recorrido y reflexión registrados; no certifica aprendizaje ni autoría.',
    };
    return JSON.stringify({ ...value, integrity: hashValue(value) }, null, 2);
  }
  async function removeCurrent() {
    if (busy.value || saving.value || !canDelete.value) return;
    saving.value = true;
    error.value = '';
    try {
      const id = progress.value.definitionHash;
      await library.remove(id, revision);
      const removed = removeWorkshopDraft(id);
      memory.delete(id);
      records.value = records.value.filter((record) => record.id !== id);
      progress.value = newProgress(definition.value, defaultWorkshopOptions);
      revision = 0;
      notice.value = removed
        ? 'Cuaderno guardado eliminado. Puedes comenzar un recorrido nuevo.'
        : 'Cuaderno de IndexedDB eliminado; no se ha podido eliminar su borrador de LocalStorage.';
      storage.value = 'Cuaderno nuevo en memoria';
    } catch {
      error.value =
        'No se ha eliminado. Otra pestaña puede haber cambiado la revisión o el almacenamiento no está disponible. Exporta tu trabajo antes de recargar.';
    } finally {
      saving.value = false;
    }
  }
  window.addEventListener('pagehide', draft);
  onScopeDispose(() => {
    window.removeEventListener('pagehide', draft);
    cancel();
  });
  return {
    catalog,
    definition,
    progress,
    step,
    busy,
    saving,
    error,
    notice,
    storage,
    load,
    open,
    answer,
    advance,
    execute,
    hint,
    solution,
    retry,
    importDefinition,
    exportDefinition,
    portfolio,
    canDelete,
    removeCurrent,
    persist,
    cancel,
    draft,
  };
});
