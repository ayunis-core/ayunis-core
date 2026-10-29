import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildCoreConnectDocuments } from './core-connect-openapi';

void buildCoreConnectDocuments().then(({ internal }) => {
  writeFileSync(
    join(process.cwd(), '../contracts/core-connect.openapi.json'),
    JSON.stringify(internal, null, 2) + '\n',
  );
});
