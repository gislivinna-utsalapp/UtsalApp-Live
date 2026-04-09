import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "utsalapp_cart";

type Listener = () => void;
const listeners = new Set<Listener>();

let cachedIds: string[] = [];
let cachedRaw: string | null = null;

function emitChange() {
  cachedRaw = null;
  listeners.forEach((l) => l());
}

function getSnapshot(): string[] {
  const raw = localStorage.getItem(STORAGE_KEY) ?? "";
  if (raw === cachedRaw) return cachedIds;
  cachedRaw = raw;
  try {
    cachedIds = raw ? JSON.parse(raw) : [];
  } catch {
    cachedIds = [];
  }
  return cachedIds;
}

const EMPTY: string[] = [];
function getServerSnapshot(): string[] {
  return EMPTY;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCart() {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addToCart = useCallback((postId: string) => {
    const current = getSnapshot();
    if (current.includes(postId)) return;
    const next = [...current, postId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    emitChange();
  }, []);

  const removeFromCart = useCallback((postId: string) => {
    const current = getSnapshot();
    const next = current.filter((id) => id !== postId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    emitChange();
  }, []);

  const toggleCart = useCallback((postId: string) => {
    const current = getSnapshot();
    if (current.includes(postId)) {
      removeFromCart(postId);
    } else {
      addToCart(postId);
    }
  }, [addToCart, removeFromCart]);

  const isInCart = useCallback(
    (postId: string) => ids.includes(postId),
    [ids],
  );

  return { cartIds: ids, cartCount: ids.length, addToCart, removeFromCart, toggleCart, isInCart };
}
