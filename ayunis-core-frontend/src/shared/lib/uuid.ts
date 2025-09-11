/**
 * Generates a UUID v4 string.
 *
 * Uses crypto.randomUUID() when available (HTTPS/secure contexts),
 * otherwise falls back to a polyfill implementation.
 *
 * @returns A UUID v4 string
 */
export function generateUUID(): string {
  // Check if crypto.randomUUID is available (requires secure context)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (error) {
      // Fall back to polyfill if crypto.randomUUID fails
      console.warn(
        "crypto.randomUUID() failed, falling back to polyfill:",
        error,
      );
    }
  }

  // Polyfill implementation for non-secure contexts
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
