import { readFileSync, writeFileSync } from 'node:fs';

const packageRoot = new URL('../', import.meta.url);
const schema = JSON.parse(
  readFileSync(new URL('openapi-schema.json', packageRoot), 'utf8'),
);
writeFileSync(
  new URL('src/request-endpoint-templates.json', packageRoot),
  JSON.stringify(Object.keys(schema.paths).sort(), null, 2) + '\n',
);
