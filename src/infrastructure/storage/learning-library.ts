import { openNeuralDatabase, LibraryError, storageError } from './database';
import { hashValue, utf8Length } from '@/domain/data/integrity';
export type LearningStore = 'contentCatalog' | 'learningReview' | 'teachingPacks';
export interface LearningRecord<T = unknown> {
  id: string;
  revision: number;
  bytes: number;
  value: T;
  integrity: string;
}
/** Damaged byte metadata cannot bypass a shared budget. */
export function learningBytes(record: { bytes: number }) {
  if (!Number.isFinite(record.bytes) || record.bytes < 0) throw new LibraryError('CORRUPT');
  return Math.max(record.bytes, utf8Length(JSON.stringify(record)) + 1024);
}
export class LearningLibrary {
  constructor(private readonly factory: () => IDBFactory = () => indexedDB) {}
  async list<T>(name: LearningStore): Promise<LearningRecord<T>[]> {
    const db = await openNeuralDatabase(this.factory);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(name, 'readonly'),
        request = tx.objectStore(name).getAll();
      let records: LearningRecord<T>[] = [];
      let failure: unknown;
      request.onsuccess = () => {
        try {
          records = request.result as LearningRecord<T>[];
          for (const r of records)
            if (
              r.integrity !== hashValue({ id: r.id, revision: r.revision, value: r.value }) ||
              !Number.isInteger(r.revision) ||
              r.revision < 1 ||
              !Number.isFinite(r.bytes) ||
              r.bytes < 0
            )
              throw new LibraryError('CORRUPT');
        } catch (error) {
          failure = error;
          tx.abort();
        }
      };
      tx.oncomplete = () => {
        db.close();
        resolve(records);
      };
      tx.onabort = () => {
        db.close();
        reject(storageError(failure ?? tx.error));
      };
    });
  }
  async save<T>(
    name: LearningStore,
    id: string,
    value: T,
    expected: number,
  ): Promise<LearningRecord<T>> {
    const payload = { id, revision: expected + 1, value: structuredClone(value) },
      record: LearningRecord<T> = {
        ...payload,
        bytes: utf8Length(JSON.stringify(payload)) + 1024,
        integrity: '',
      };
    if (!Number.isInteger(expected) || expected < 0 || !id || id.length > 100)
      throw new LibraryError('CORRUPT');
    const group =
      name === 'learningReview'
        ? ['learningReview', 'learningEvidence']
        : ['contentCatalog', 'teachingPacks'];
    const limit = (name === 'learningReview' ? 8 : 16) * 1024 * 1024;
    if (record.bytes > limit) throw new LibraryError('LIMIT');
    record.integrity = hashValue(payload);
    const db = await openNeuralDatabase(this.factory);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(group, 'readwrite');
      let failure: unknown;
      let pending = group.length,
        total = record.bytes;
      let prior: LearningRecord<T> | undefined;
      const abort = (error: unknown) => {
        failure = error;
        tx.abort();
      };
      for (const storeName of group) {
        const store = tx.objectStore(storeName),
          request = store.getAll();
        request.onsuccess = () => {
          try {
            const records = request.result as LearningRecord<T>[];
            for (const r of records) {
              if (storeName === name && r.id === id) prior = r;
              else total += learningBytes(r);
            }
            if (--pending) return;
            if ((prior?.revision ?? 0) !== expected) throw new LibraryError('CONFLICT');
            if (total > limit) throw new LibraryError('LIMIT');
            tx.objectStore(name).put(record);
          } catch (error) {
            abort(error);
          }
        };
      }
      tx.oncomplete = () => {
        db.close();
        resolve(record);
      };
      tx.onabort = () => {
        db.close();
        reject(storageError(failure ?? tx.error));
      };
    });
  }
  async remove(name: LearningStore, id: string, expected: number): Promise<void> {
    const db = await openNeuralDatabase(this.factory);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(name, 'readwrite'),
        store = tx.objectStore(name),
        request = store.get(id);
      let failure: unknown;
      request.onsuccess = () => {
        if ((request.result as LearningRecord | undefined)?.revision !== expected) {
          failure = new LibraryError('CONFLICT');
          tx.abort();
        } else store.delete(id);
      };
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onabort = () => {
        db.close();
        reject(storageError(failure ?? tx.error));
      };
    });
  }
}
