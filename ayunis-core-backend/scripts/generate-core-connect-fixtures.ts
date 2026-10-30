import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { webhookEnvelopeSchema } from '@ayunis-core/connect-sdk/contracts';
import { createContractFixtures } from '../src/integrations/webhooks/testing/contract-fixtures';

const fixtures = createContractFixtures();
fixtures.forEach((fixture) => webhookEnvelopeSchema.parse(fixture));
writeFileSync(
  join(
    process.cwd(),
    '../packages/core-connect-sdk/fixtures/core-webhooks.json',
  ),
  JSON.stringify(fixtures, null, 2) + '\n',
);
