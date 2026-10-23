import {
  captureExperiment,
  experimentWire,
  prepareExperiment,
  type Experiment,
} from '@/application/training/experiment';
import { hashValue, utf8Length } from '@/domain/data/integrity';
import { experimentStorageBytes } from './experiment-library';
import { LibraryError, openNeuralDatabase, storageError } from './database';
export type RecoveryCapture = Parameters<typeof captureExperiment>;
export const recoverySlotLimit = 10 * 1024 * 1024;
interface Slot {
  key: string;
  snapshot: Experiment;
  integrity: string;
  bytes: number;
}
interface RecordData {
  id: 'active';
  revision: number;
  owner: string;
  slots: Slot[];
  locks: { key: string; frozen: boolean; consulted: boolean }[];
  locksIntegrity: string;
}
export interface RecoverySummary {
  revision: number;
  owner: string;
  slots: { savedAt: string; epoch: number; updates: number; frozen: boolean }[];
}
function header(record: RecordData) {
  if (
    record.id !== 'active' ||
    !Number.isSafeInteger(record.revision) ||
    record.revision < 1 ||
    typeof record.owner !== 'string' ||
    !/^[\w-]{1,64}$/.test(record.owner) ||
    !Array.isArray(record.slots) ||
    record.slots.length < 1 ||
    record.slots.length > 2
  )
    throw new LibraryError('CORRUPT');
  if (
    !Array.isArray(record.locks) ||
    record.locks.length > 2 ||
    record.locks.some(
      (lock) =>
        !/^[a-f0-9]{64}$/.test(lock.key) ||
        typeof lock.frozen !== 'boolean' ||
        typeof lock.consulted !== 'boolean',
    ) ||
    record.locksIntegrity !== hashValue(record.locks)
  )
    throw new LibraryError('CORRUPT');
}
function sessionKey(snapshot: Experiment) {
  return hashValue({ dataset: snapshot.dataset, config: snapshot.config });
}
function valid(slot: Slot) {
  try {
    if (
      !Number.isFinite(slot.bytes) ||
      slot.bytes < 1 ||
      slot.bytes > recoverySlotLimit ||
      slot.key !== sessionKey(slot.snapshot) ||
      slot.integrity !== hashValue(experimentWire(slot.snapshot))
    )
      return false;
    prepareExperiment(slot.snapshot);
    return true;
  } catch {
    return false;
  }
}
function summary(record: RecordData): RecoverySummary {
  return {
    revision: record.revision,
    owner: record.owner,
    slots: record.slots.map(({ snapshot, key }) => ({
      savedAt: snapshot.savedAt,
      epoch: snapshot.checkpoint.epoch,
      updates: snapshot.checkpoint.updates,
      frozen: snapshot.checkpoint.frozen || !!record.locks.find((lock) => lock.key === key)?.frozen,
    })),
  };
}
/** One global record, two complete slots. Hashing and validation run in the recovery Worker. */
export class TrainingRecovery {
  constructor(private readonly factory: () => IDBFactory = () => indexedDB) {}
  private async transact<T>(
    mode: IDBTransactionMode,
    action: (
      store: IDBObjectStore,
      done: (value: T) => void,
      fail: (error: unknown) => void,
    ) => void,
  ): Promise<T> {
    const db = await openNeuralDatabase(this.factory);
    return new Promise((resolve, reject) => {
      const tx = db.transaction('trainingRecovery', mode);
      let result: T, error: unknown;
      tx.oncomplete = () => {
        db.close();
        resolve(result);
      };
      tx.onabort = () => {
        db.close();
        reject(storageError(error ?? tx.error));
      };
      const fail = (caught: unknown) => {
        error = caught;
        tx.abort();
      };
      try {
        action(
          tx.objectStore('trainingRecovery'),
          (value) => {
            result = value;
          },
          fail,
        );
      } catch (caught) {
        fail(caught);
      }
    });
  }
  private raw(): Promise<RecordData | undefined> {
    return this.transact('readonly', (store, done) => {
      const req = store.get('active');
      req.onsuccess = () => done(req.result as RecordData | undefined);
    });
  }
  async read(): Promise<
    { summary: RecoverySummary; snapshot: Experiment; fallback: boolean } | undefined
  > {
    const record = await this.raw();
    if (!record) return undefined;
    header(record);
    const index = record.slots.findIndex(valid);
    if (index < 0) throw new LibraryError('CORRUPT');
    const snapshot = structuredClone(record.slots[index]!.snapshot);
    const lock = record.locks.find((item) => item.key === record.slots[index]!.key);
    snapshot.checkpoint.frozen ||= !!lock?.frozen;
    snapshot.testConsulted ||= !!lock?.consulted;
    return {
      summary: summary({ ...record, slots: record.slots.filter(valid) }),
      snapshot,
      fallback: index > 0,
    };
  }
  async save(
    args: RecoveryCapture,
    owner: string,
    expectedRevision: number,
    replace: boolean,
  ): Promise<RecoverySummary> {
    if (!/^[\w-]{1,64}$/.test(owner)) throw new LibraryError('CORRUPT');
    const snapshot = captureExperiment(...args),
      wire = experimentWire(snapshot);
    const slot: Slot = {
      key: sessionKey(snapshot),
      snapshot,
      integrity: hashValue(wire),
      bytes: experimentStorageBytes(snapshot, utf8Length(JSON.stringify(wire))) + 1024,
    };
    if (slot.bytes > recoverySlotLimit) throw new LibraryError('LIMIT');
    return this.transact('readwrite', (store, done, fail) => {
      const req = store.get('active');
      req.onsuccess = () => {
        try {
          const prior = req.result as RecordData | undefined;
          if (prior) header(prior);
          if (
            (prior?.revision ?? 0) !== expectedRevision ||
            (prior && prior.owner !== owner && !replace)
          )
            throw new LibraryError('CONFLICT');
          const previous = prior?.slots.find(valid);
          const slots = [slot, ...(previous ? [previous] : [])];
          const locks = [...new Set(slots.map((item) => item.key))].map((key) => ({
            key,
            frozen:
              slots.some((item) => item.key === key && item.snapshot.checkpoint.frozen) ||
              !!prior?.locks.find((item) => item.key === key)?.frozen,
            consulted:
              slots.some((item) => item.key === key && item.snapshot.testConsulted) ||
              !!prior?.locks.find((item) => item.key === key)?.consulted,
          }));
          const record: RecordData = {
            id: 'active',
            revision: expectedRevision + 1,
            owner,
            slots,
            locks,
            locksIntegrity: hashValue(locks),
          };
          store.put(record);
          done(summary(record));
        } catch (caught) {
          fail(caught);
        }
      };
    });
  }
  remove(expectedRevision: number): Promise<void> {
    return this.transact('readwrite', (store, done, fail) => {
      const req = store.get('active');
      req.onsuccess = () => {
        if ((req.result as RecordData | undefined)?.revision !== expectedRevision) {
          fail(new LibraryError('CONFLICT'));
          return;
        }
        store.delete('active');
        done(undefined);
      };
    });
  }
}
