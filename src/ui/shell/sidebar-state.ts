/** The collapsed sidebar is a per-device choice (U4, D28), so it lives in localStorage, not on the profile. */
export const SIDEBAR_STORAGE_KEY = "flipside.sidebar.collapsed";

/** Storage can be missing or throw (private mode, blocked cookies); then the sidebar just stays expanded. */
type Store = Pick<Storage, "getItem" | "setItem">;
function storage(): Store | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function readCollapsed(store: Store | null = storage()): boolean {
  try {
    const saved = store?.getItem(SIDEBAR_STORAGE_KEY);
    if (saved != null) return saved === "1";
  } catch {
    // fall through to the in-memory value
  }
  return memory ?? false;
}

// Storage may be unwritable, so the in-memory value keeps the toggle working for this page view.
let memory: boolean | null = null;
const listeners = new Set<() => void>();

export function writeCollapsed(collapsed: boolean, store: Store | null = storage()): void {
  memory = collapsed;
  try {
    store?.setItem(SIDEBAR_STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    // Not remembered across visits.
  }
  listeners.forEach((l) => l());
}

export function subscribeCollapsed(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
