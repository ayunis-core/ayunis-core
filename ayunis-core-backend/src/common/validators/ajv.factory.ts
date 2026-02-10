import Ajv from 'ajv';
import addFormats from 'ajv-formats';

/**
 * Creates an Ajv instance with standard JSON Schema format support (uri, email, date-time, etc.).
 * Use this instead of `new Ajv()` to ensure format keywords in schemas are recognized.
 */
export function createAjv(): Ajv {
  const ajv = new Ajv();
  addFormats(ajv);
  return ajv;
}
