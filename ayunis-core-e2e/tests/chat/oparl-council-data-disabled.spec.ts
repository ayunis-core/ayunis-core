import {
  OPARL_TOOL_NOT_OFFERED,
  callOparlTool,
  createCouncilChat,
  findOparlCatalogBody,
  linkOparlBodies,
} from '../../src/clients/api/oparl.client';
import { expect, test } from '../../src/fixtures/test';

// Same database and frontend build, served by a second backend started with
// FEATURE_OPARL_ENABLED=false (see .github/workflows/e2e-tests.yml).
const disabledApiUrl =
  process.env.E2E_OPARL_DISABLED_API_URL ??
  process.env.E2E_OPARL_DISABLED_BASE_URL ??
  'http://localhost:3003';

test('with OParl disabled a chat of an org with a linked council body offers no council tools', async ({
  api,
}) => {
  // Not Musterstadt: oparl-body-links.spec.ts links it to the worker org itself.
  const body = await findOparlCatalogBody(api, 'Ortsgemeinde Beispielhausen');
  await linkOparlBodies(api, [body.id]);
  const chat = await createCouncilChat(api);

  // The flag-on backend offers them in the same chat.
  expect(
    await callOparlTool(api, chat, 'oparl_list', { type: 'organizations' }),
  ).toContain('Bau- und Umweltausschuss');

  for (const [tool, args] of [
    ['oparl_search', { queries: ['Dorfgemeinschaftshaus'] }],
    ['oparl_get', { id: body.id }],
    ['oparl_read_file', { fileId: body.id }],
    ['oparl_list', { type: 'meetings' }],
  ] as const) {
    expect(
      await callOparlTool(api, chat, tool, { ...args }, disabledApiUrl),
    ).toBe(OPARL_TOOL_NOT_OFFERED);
  }
});
