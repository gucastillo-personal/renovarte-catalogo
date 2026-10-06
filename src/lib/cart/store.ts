import { parseStored, serialize, type CartLine } from "@/lib/cart/model";

/** Clave en `localStorage` (versionada, ux.md "Persistencia"). */
export const CART_STORAGE_KEY = "renovarte:carrito:v1";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

interface StorageEventLike {
  key: string | null;
}

interface EventTargetLike {
  addEventListener(type: "storage", l: (e: StorageEventLike) => void): void;
  removeEventListener(type: "storage", l: (e: StorageEventLike) => void): void;
}

export interface CartStoreOptions {
  /** `null` si el navegador no da `localStorage` (modo privado, bloqueado): el carrito vive solo en memoria. */
  storage: StorageLike | null;
  /** Dónde escuchar el evento `storage` de otras pestañas; en producción, `window`. */
  target?: EventTargetLike | null;
}

export interface CartStore {
  subscribe(listener: () => void): () => void;
  /** Referencia estable entre cambios: apto para `useSyncExternalStore`. */
  getSnapshot(): readonly CartLine[];
  /** Siempre vacío: el HTML del servidor no conoce el carrito (sin mismatch de hidratación). */
  getServerSnapshot(): readonly CartLine[];
  /** Aplica una operación pura del modelo, persiste y notifica. */
  update(fn: (lines: readonly CartLine[]) => readonly CartLine[]): void;
}

const EMPTY: readonly CartLine[] = Object.freeze([]);

export function createCartStore({ storage, target = null }: CartStoreOptions): CartStore {
  let cache: readonly CartLine[] | null = null;
  const listeners = new Set<() => void>();

  const read = (): readonly CartLine[] => {
    try {
      return parseStored(storage ? storage.getItem(CART_STORAGE_KEY) : null);
    } catch {
      return [];
    }
  };

  const notify = () => listeners.forEach((l) => l());

  const onStorage = (e: StorageEventLike) => {
    // `key === null` es `localStorage.clear()` en otra pestaña.
    if (e.key !== null && e.key !== CART_STORAGE_KEY) return;
    cache = read();
    notify();
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) target?.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) target?.removeEventListener("storage", onStorage);
      };
    },
    getSnapshot() {
      if (cache === null) cache = read();
      return cache;
    },
    getServerSnapshot() {
      return EMPTY;
    },
    update(fn) {
      const current = cache ?? (cache = read());
      const next = fn(current);
      cache = next;
      try {
        if (storage) {
          if (next.length === 0) storage.removeItem(CART_STORAGE_KEY);
          else storage.setItem(CART_STORAGE_KEY, serialize(next));
        }
      } catch {
        // Sin espacio o bloqueado: el carrito sigue funcionando en memoria.
      }
      notify();
    },
  };
}
