import { vi } from 'vitest';
/** Controlled IDB port for fault injection. Native browser tests verify actual transaction isolation. */
export function libraryPort() {
  const tables: Record<string, Map<string, unknown>> = {};
  const close = vi.fn();
  let nextWriteError: DOMException | undefined;
  let created = false;
  const db = {
    objectStoreNames: { contains: (name: string) => Object.hasOwn(tables, name) },
    close,
    onversionchange: null as (() => void) | null,
    createObjectStore(name: string) {
      tables[name] = new Map();
      return { createIndex: vi.fn() };
    },
    transaction() {
      const staged = Object.fromEntries(
        Object.entries(tables).map(([key, rows]) => [key, new Map(rows)]),
      );
      let pending = 0,
        aborted = false;
      const tx = {
        oncomplete: null as (() => void) | null,
        onabort: null as (() => void) | null,
        onerror: null as (() => void) | null,
        error: null as DOMException | null,
        abort() {
          aborted = true;
          queueMicrotask(() => tx.onabort?.());
        },
        objectStore(name: string) {
          const table = staged[name]!;
          const request = (callback: () => unknown) => {
            pending++;
            const req = { result: undefined as unknown, onsuccess: null as (() => void) | null };
            queueMicrotask(() => {
              if (aborted) return;
              req.result = structuredClone(callback());
              req.onsuccess?.();
              pending--;
              queueMicrotask(() => {
                if (pending || aborted) return;
                Object.assign(tables, staged);
                tx.oncomplete?.();
              });
            });
            return req;
          };
          const write = (callback: () => void) => {
            if (nextWriteError) {
              tx.error = nextWriteError;
              nextWriteError = undefined;
              tx.abort();
              return;
            }
            callback();
          };
          return {
            get: (id: string) => request(() => table.get(id)),
            getAll: () => request(() => Array.from(table.values())),
            index: () => ({ getAll: () => request(() => Array.from(table.values())) }),
            put: (row: { id: string }) => write(() => table.set(row.id, structuredClone(row))),
            delete: (id: string) =>
              write(() => {
                table.delete(id);
              }),
          };
        },
      };
      return tx;
    },
  };
  const factory = {
    open() {
      const req = {
        result: db,
        onupgradeneeded: null as (() => void) | null,
        onsuccess: null as (() => void) | null,
        onblocked: null as (() => void) | null,
        onerror: null as (() => void) | null,
      };
      queueMicrotask(() => {
        if (!created) {
          created = true;
          req.onupgradeneeded?.();
        }
        req.onsuccess?.();
      });
      return req;
    },
  } as unknown as IDBFactory;
  return {
    factory,
    tables,
    db,
    close,
    failWrite: (error: DOMException) => {
      nextWriteError = error;
    },
  };
}
