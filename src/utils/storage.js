export function safeStorageGet(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) {
      return fallback;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Failed to read localStorage key "${key}"`, error);
    return fallback;
  }
}

export function safeStorageSet(key, value) {
  try {
    const serialized = JSON.stringify(value);
    window.localStorage.setItem(key, serialized);
    return {
      ok: true,
      error: null,
    };
  } catch (error) {
    console.error(`Failed to write localStorage key "${key}"`, error);
    const quotaExceeded =
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' ||
        error.code === 22 ||
        error.code === 1014);

    return {
      ok: false,
      error: quotaExceeded ? 'quota' : 'storage',
    };
  }
}

export function safeStorageRemove(key) {
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Failed to remove localStorage key "${key}"`, error);
    return false;
  }
}
