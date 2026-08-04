import Ajv from 'ajv';
import addFormats from 'ajv-formats';

/**
 * Creates an Ajv instance with standard JSON Schema format support (uri, email, date-time, etc.).
 * Use this instead of `new Ajv()` to ensure format keywords in schemas are recognized.
 * Pass `allErrors` when every violation should be reported instead of only the
 * first — e.g. for validation messages fed back to a model.
 */
export function createAjv(options?: { allErrors?: boolean }): Ajv {
  const ajv = new Ajv({ allErrors: options?.allErrors ?? false });
  addFormats(ajv);
  return ajv;
}
