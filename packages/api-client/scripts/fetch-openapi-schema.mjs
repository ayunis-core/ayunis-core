import { readFile, writeFile } from 'node:fs/promises';

function preserveEntryOrder(entries, previous = {}) {
  const keys = new Set([
    ...Object.keys(previous),
    ...Object.keys(entries).sort(),
  ]);
  return Object.fromEntries(
    [...keys]
      .filter((key) => Object.hasOwn(entries, key))
      .map((key) => [key, entries[key]]),
  );
}

const baseUrl = (process.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api')
  .trim()
  .replace(/\/+$/, '');
const endpoint = `${baseUrl}/docs-json`;
const response = await fetch(endpoint);
if (!response.ok) {
  throw new Error(`Fetching ${endpoint} returned HTTP ${response.status}`);
}

const schema = await response.json();
const schemaFile = new URL('../openapi-schema.json', import.meta.url);
const previous = await readFile(schemaFile, 'utf8').then(
  JSON.parse,
  (error) => {
    if (error.code === 'ENOENT') return {};
    throw error;
  },
);
// Nest can change the order of resources when modules are reorganized.
// Retain the committed entry order so that changes to the API stay visible.
schema.paths = preserveEntryOrder(schema.paths, previous.paths);
if (schema.components?.schemas) {
  schema.components.schemas = preserveEntryOrder(
    schema.components.schemas,
    previous.components?.schemas,
  );
}
await writeFile(schemaFile, JSON.stringify(schema, null, 2) + '\n');
console.log(`Fetched OpenAPI schema from ${endpoint}`);
