import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createContractFixtures } from 'src/integrations/webhooks/testing/contract-fixtures';

const fixtures = createContractFixtures();
writeFileSync(
  join(
    process.cwd(),
    '../packages/core-connect-sdk/fixtures/core-webhooks.json',
  ),
  JSON.stringify(fixtures, null, 2) + '\n',
);
