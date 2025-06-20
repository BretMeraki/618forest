/**
 * Safe utility helpers shared across Forest server modules.
 */

/**
 * Safely JSON.parse a string.  Returns `defaultValue` on failure.
 * @param {string} str
 * @param {any} [defaultValue={}] – value to return if parsing fails.
 */
export function safeJsonParse(str, defaultValue = {}) {
  try {
    if (typeof str !== 'string') {
      return defaultValue;
    }
    return JSON.parse(str);
  } catch (err) {
    console.error('safeJsonParse: invalid JSON – returning default.', err?.message);
    return defaultValue;
  }
}

/**
 * Safely access nested properties (`obj.a.b.c`).
 * @param {object} obj
 * @param {string} path – dot separated path
 * @param {any} [defaultValue=null]
 */
export function safeGet(obj, path, defaultValue = null) {
  if (!obj || typeof obj !== 'object') {
    return defaultValue;
  }
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current && Object.prototype.hasOwnProperty.call(current, key)) {
      current = current[key];
    } else {
      return defaultValue;
    }
  }
  return current;
}
