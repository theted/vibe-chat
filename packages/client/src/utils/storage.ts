/**
 * Safe localStorage helpers. All storage access goes through these so a
 * missing window (SSR/tests), quota errors, and corrupt JSON warn instead
 * of throwing. Keys live in constants/storage.ts.
 */

export const getStorageItem = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`Failed to read "${key}" from localStorage:`, error);
    return null;
  }
};

export const setStorageItem = (key: string, value: string): boolean => {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`Failed to write "${key}" to localStorage:`, error);
    return false;
  }
};

export const removeStorageItem = (key: string): boolean => {
  if (typeof window === "undefined") return false;
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`Failed to remove "${key}" from localStorage:`, error);
    return false;
  }
};

export const getStorageJson = <T>(key: string): T | null => {
  const raw = getStorageItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`Failed to parse "${key}" from localStorage:`, error);
    return null;
  }
};

export const setStorageJson = (key: string, value: unknown): boolean => {
  try {
    return setStorageItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to serialize "${key}" for localStorage:`, error);
    return false;
  }
};
