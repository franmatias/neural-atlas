import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import { requestRecovery } from '@/infrastructure/workers/recovery-client';
import { LibraryError } from '@/infrastructure/storage/database';
import { recoveryDue } from '@/application/training/recovery';
import type { RecoveryCapture, RecoverySummary } from '@/infrastructure/storage/training-recovery';
import type { Experiment } from '@/application/training/experiment';
export const useRecoveryStore = defineStore('recovery', () => {
  const enabled = ref(true),
    saving = ref(false),
    loading = ref(false);
  const available = shallowRef<RecoverySummary>();
  const message = ref('Buscando puntos de recuperación…');
  const owner = crypto.randomUUID();
  let revision = 0,
    replace = false,
    blocked = false,
    loaded = false;
  let last: { at: number; epoch: number } | undefined;
  let pending: RecoveryCapture | undefined;
  async function load() {
    if (loading.value || saving.value) return;
    loading.value = true;
    try {
      const result = (await requestRecovery({ type: 'read' })) as
        { summary: RecoverySummary } | undefined;
      available.value = result?.summary;
      revision = result?.summary.revision ?? 0;
      blocked = !!result && result.summary.owner !== owner;
      message.value = result
        ? 'Hay un punto guardado. Recupera o sustituye la copia de forma explícita.'
        : 'Recuperación automática lista; todavía no hay una sesión guardada.';
    } catch {
      blocked = true;
      message.value =
        'Recuperación en disco no disponible. Puedes guardar o exportar desde Biblioteca.';
    } finally {
      loaded = true;
      loading.value = false;
    }
  }
  async function save(args: RecoveryCapture) {
    saving.value = true;
    try {
      const result = (await requestRecovery({
        type: 'save',
        args,
        owner,
        revision,
        replace,
      })) as RecoverySummary;
      available.value = result;
      revision = result.revision;
      replace = false;
      last = { at: performance.now(), epoch: args[5].epoch };
      message.value = `Recuperación guardada · época ${args[5].epoch} · actualización ${args[5].updates}.`;
    } catch (error) {
      blocked = true;
      message.value =
        error instanceof LibraryError && error.code === 'CONFLICT'
          ? 'Otra pestaña cambió la recuperación. Se conserva su copia; revisa los puntos antes de sustituirlos.'
          : 'No se pudo guardar la recuperación (cuota, tamaño o almacenamiento). La sesión sigue en memoria; usa Biblioteca para exportarla.';
    } finally {
      saving.value = false;
      const next = pending;
      pending = undefined;
      if (next && enabled.value && !blocked) void save(next);
    }
  }
  function offer(args: RecoveryCapture, force = false) {
    if (
      !loaded ||
      loading.value ||
      !enabled.value ||
      blocked ||
      !recoveryDue(last, performance.now(), args[5].epoch, force)
    )
      return;
    if (saving.value) {
      pending = args;
      return;
    }
    void save(args);
  }
  function reset() {
    pending = undefined;
    last = undefined;
  }
  async function recover(): Promise<Experiment | undefined> {
    if (saving.value || loading.value) return;
    loading.value = true;
    try {
      const result = (await requestRecovery({ type: 'read' })) as
        { summary: RecoverySummary; snapshot: Experiment; fallback: boolean } | undefined;
      if (!result) {
        message.value = 'Ya no hay un punto disponible.';
        return;
      }
      available.value = result.summary;
      revision = result.summary.revision;
      blocked = false;
      replace = true;
      reset();
      message.value = result.fallback
        ? 'Recuperada la copia anterior: la más reciente no era válida.'
        : 'Copia validada. La sesión se abrirá detenida.';
      return result.snapshot;
    } catch {
      message.value = 'No se pudo validar la recuperación. La sesión actual se conserva.';
    } finally {
      loading.value = false;
    }
  }
  function takeOver() {
    if (loaded && !loading.value && !saving.value) {
      blocked = false;
      replace = true;
      reset();
      message.value = 'La próxima copia de esta sesión sustituirá la recuperación disponible.';
    }
  }
  async function remove() {
    if (loading.value || saving.value) return;
    loading.value = true;
    try {
      await requestRecovery({ type: 'remove', revision });
      available.value = undefined;
      revision = 0;
      blocked = false;
      replace = false;
      reset();
      message.value = 'Puntos de recuperación eliminados.';
    } catch {
      blocked = true;
      message.value =
        'No se han eliminado: revisa si otra pestaña guardó una versión más reciente.';
    } finally {
      loading.value = false;
    }
  }
  return {
    enabled,
    saving,
    loading,
    available,
    message,
    load,
    offer,
    reset,
    recover,
    takeOver,
    remove,
  };
});
