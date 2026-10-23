export class LibraryError extends Error {
  constructor(
    public readonly code:
      'UNAVAILABLE' | 'BLOCKED' | 'CONFLICT' | 'LIMIT' | 'QUOTA' | 'CORRUPT' | 'MISSING',
  ) {
    super(code);
  }
}
export function storageError(error: unknown) {
  return error instanceof LibraryError
    ? error
    : new LibraryError(
        error instanceof DOMException && error.name === 'QuotaExceededError'
          ? 'QUOTA'
          : 'UNAVAILABLE',
      );
}
/** v2 adds learning evidence while preserving the two v1 experiment stores. */
export function openNeuralDatabase(
  factory: () => IDBFactory = () => indexedDB,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let blocked = false;
    try {
      const request = factory().open('neural-atlas', 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('experiments'))
          db.createObjectStore('experiments', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('libraryIndex'))
          db.createObjectStore('libraryIndex', { keyPath: 'id' }).createIndex(
            'updatedAt',
            'updatedAt',
          );
        if (!db.objectStoreNames.contains('learningEvidence'))
          db.createObjectStore('learningEvidence', { keyPath: 'id' });
      };
      request.onerror = () => reject(storageError(request.error));
      request.onblocked = () => {
        blocked = true;
        reject(new LibraryError('BLOCKED'));
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        if (blocked) db.close();
        else resolve(db);
      };
    } catch (error) {
      reject(storageError(error));
    }
  });
}
