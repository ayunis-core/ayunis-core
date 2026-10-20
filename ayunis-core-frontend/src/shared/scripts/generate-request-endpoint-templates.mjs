import { readFileSync, writeFileSync } from 'node:fs';

const apiDirectory = new URL('../api/', import.meta.url);
const schema = JSON.parse(
  readFileSync(new URL('openapi-schema.json', apiDirectory), 'utf8'),
);
writeFileSync(
  new URL('request-endpoint-templates.json', apiDirectory),
  JSON.stringify(Object.keys(schema.paths).sort(), null, 2) + '\n',
);
