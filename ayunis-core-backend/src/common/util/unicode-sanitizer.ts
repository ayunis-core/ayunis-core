/**
 * Utility functions for sanitizing and handling Unicode escape sequences
 */

/**
 * Ultra-simple JSON string fixer that removes only the most problematic sequences.
 * No complex regex, just targets the exact problems we've seen in production.
 *
 * @param input - The string to sanitize
 * @returns The sanitized string
 */
export function sanitizeUnicodeEscapes(input: unknown): string {
  if (input === null || input === undefined || typeof input !== 'string') {
    return String(input);
  }

  return (
    input
      // Only remove \u sequences that are clearly broken Unicode escapes
      // Be extremely conservative to avoid breaking file paths, URLs, etc.
      .replace(/\\u000[\s"'}),\].]/g, '\\u0000') // Fix \u000 followed by clear delimiters (added .)
      .replace(/\\u00[\s"'}),\].]/g, '\\u0000') // Fix \u00 followed by clear delimiters (added .)
      .replace(/\\u0[\s"'}),\].]/g, '\\u0000') // Fix \u0 followed by clear delimiters (added .)
      .replace(/\\u[\s"'}),\].]/g, '\\u0000') // Fix \u followed by clear delimiters (added .)
      .replace(/\\u000$/, '') // Fix \u000 at end of string
      .replace(/\\u00$/, '') // Fix \u00 at end of string
      .replace(/\\u0$/, '') // Fix \u0 at end of string
      .replace(/\\u$/, '') // Fix \u at end of string
      .replace(/\\u0000/g, '') // Remove completed nulls
      .replace(new RegExp(String.fromCharCode(0), 'g'), '') // Remove actual NULL characters
  );
}

/**
 * Ultra-simple safe JSON parser. Just tries to fix the most common issues.
 *
 * @param jsonString - The JSON string to parse
 * @param fallbackValue - Value to return if parsing fails
 * @returns Parsed JSON or fallback value
 */
export function safeJsonParse<T>(
  jsonString: string,
  fallbackValue?: T,
): T | null {
  if (!jsonString || typeof jsonString !== 'string') {
    return fallbackValue ?? null;
  }

  // Try parsing as-is first
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    // If that fails, try with simple fix
    try {
      const cleaned = sanitizeUnicodeEscapes(jsonString);
      return JSON.parse(cleaned) as T;
    } catch {
      // If all fails, just return fallback - no logging spam
      return fallbackValue ?? null;
    }
  }
}

/**
 * Recursively sanitize an object to handle invalid Unicode escape sequences in string values.
 * Preserves the original structure while sanitizing all string values.
 *
 * @param obj - The object to sanitize
 * @returns A new object with sanitized string values
 */
export function sanitizeObject<T>(obj: T): T {
  // Handle primitives
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeUnicodeEscapes(obj) as T;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return obj.map((item) => sanitizeObject(item)) as T;
  }

  // Handle objects
  const sanitized = {} as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeObject(value);
  }

  return sanitized as T;
}
