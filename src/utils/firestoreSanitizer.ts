/**
 * Firestore Data Sanitizer
 * Recursively cleans any object or array to ensure NO `undefined` values are sent to Cloud Firestore.
 * Converted to `null` or omitted, preventing:
 * "FirebaseError: Function setDoc() called with invalid data. Unsupported field value: undefined"
 */

export function cleanUndefined<T = any>(val: T): T {
  if (val === undefined) {
    return null as unknown as T;
  }
  if (val === null) {
    return null as unknown as T;
  }
  if (Array.isArray(val)) {
    return val.map((item) => cleanUndefined(item)) as unknown as T;
  }
  if (typeof val === 'object' && !(val instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(val)) {
      if (value === undefined) {
        cleaned[key] = null;
      } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
        cleaned[key] = cleanUndefined(value);
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned as T;
  }
  return val;
}

export const sanitizeForFirestore = cleanUndefined;
