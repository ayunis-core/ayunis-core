import { generatedApi } from '../../src/clients/api/generated-api';
import { createChat } from '../../src/clients/api/memory.client';
import {
  handOffSessionToOutlook,
  refreshPaneTokens,
  routeStatus,
  routeStatusWithBearer,
  type RouteCall,
} from '../../src/clients/api/session-tokens.client';
import { expect, test } from '../../src/fixtures/test';

// An id nothing has: those routes answer 404, which is past the client guard.
const MISSING = '00000000-0000-4000-8000-000000000000';

/** Routes opened to the Outlook token for the embedded chat app (AYC-1895). */
function embeddedAppRoutes(threadId: string): RouteCall[] {
  return [
    { method: 'GET', path: '/chat-settings/chat-start-defaults' },
    { method: 'GET', path: '/models/embedding/enabled' },
    { method: 'GET', path: '/models/permitted/language-models' },
    { method: 'GET', path: '/models/modes' },
    { method: 'GET', path: '/academy-access/status' },
    { method: 'POST', path: '/transcriptions' },
    { method: 'GET', path: '/runs/active' },
    { method: 'GET', path: `/runs/threads/${threadId}/events` },
    { method: 'POST', path: `/runs/threads/${threadId}/cancel` },
    { method: 'DELETE', path: `/threads/${threadId}/sources/${MISSING}` },
    { method: 'GET', path: `/threads/${threadId}/source-chunks/${MISSING}` },
    {
      method: 'POST',
      path: `/threads/${threadId}/pii-masks/${MISSING}/unmask`,
    },
    {
      method: 'GET',
      path: `/threads/${threadId}/messages/${MISSING}/images/0`,
    },
  ];
}

/** Routes the embedded app keeps away from by hiding their controls. */
function closedRoutes(threadId: string): RouteCall[] {
  return [
    { method: 'GET', path: '/onboarding' },
    { method: 'GET', path: '/subscriptions/active' },
    { method: 'GET', path: '/chat-settings/system-prompt' },
    { method: 'GET', path: `/threads/${threadId}/ai-context` },
    { method: 'GET', path: '/favorites' },
    { method: 'GET', path: '/api-keys' },
    // The pane has no skill picker (product decision, AYC-1897).
    { method: 'GET', path: '/skills?ownerType=personal' },
  ];
}

const label = ({ method, path }: RouteCall) => `${method} ${path}`;

test('an Outlook token reaches only the routes the embedded chat app calls; browser sessions and API keys are unaffected', async ({
  api,
}) => {
  const threadId = await createChat(api);
  const pane = await handOffSessionToOutlook(api);
  const apiKey = await generatedApi.apiKeysControllerCreateApiKey(
    { name: `E2E route access ${Date.now()}` },
    { api },
  );

  for (const call of closedRoutes(threadId)) {
    expect
      .soft(await routeStatusWithBearer(pane.accessToken, call), label(call))
      .toBe(403);
    expect.soft(await routeStatus(api, call), label(call)).toBe(200);
    expect
      .soft(await routeStatusWithBearer(apiKey.secret, call), label(call))
      .toBe(401);
  }

  for (const call of embeddedAppRoutes(threadId)) {
    const browserStatus = await routeStatus(api, call);
    expect.soft(browserStatus, label(call)).not.toBe(403);
    expect
      .soft(await routeStatusWithBearer(pane.accessToken, call), label(call))
      .toBe(browserStatus);
    expect
      .soft(await routeStatusWithBearer(apiKey.secret, call), label(call))
      .toBe(401);
  }

  // A refreshed pane token keeps the `outlook` restriction.
  const { accessToken } = await refreshPaneTokens(pane.refreshToken);
  const [closed] = closedRoutes(threadId);
  const [opened] = embeddedAppRoutes(threadId);
  expect(await routeStatusWithBearer(accessToken, closed)).toBe(403);
  expect(await routeStatusWithBearer(accessToken, opened)).toBe(200);
});
