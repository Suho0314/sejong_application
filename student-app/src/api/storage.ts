const memoryStorage = new Map<string, string>();

const getLocalStorage = () => {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
    return null;
  }

  return (globalThis as typeof globalThis & { localStorage: Storage }).localStorage;
};

export const appStorage = {
  getItem(key: string) {
    const storage = getLocalStorage();
    return storage?.getItem(key) ?? memoryStorage.get(key) ?? null;
  },

  setItem(key: string, value: string) {
    const storage = getLocalStorage();

    if (storage) {
      storage.setItem(key, value);
      return;
    }

    memoryStorage.set(key, value);
  },

  removeItem(key: string) {
    const storage = getLocalStorage();
    storage?.removeItem(key);
    memoryStorage.delete(key);
  },
};
