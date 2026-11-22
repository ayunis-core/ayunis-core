import { requestOutlookManifest } from '../../src/clients/api/office-addins.client';
import { stubOfficeHost } from '../../src/clients/office-host-stub';
import { expect, test } from '../../src/fixtures/test';
import {
  dispatchLaunchEvent,
  officeItemCalls,
  openLaunchEventRuntime,
} from '../../src/flows/outlook.flow';

test.use({ storageState: { cookies: [], origins: [] } });

// Outlook calls each launch event's FunctionName in the runtime the served
// manifest names. A name the runtime does not register, or a handler that
// does not complete, leaves Outlook waiting on the add-in for every mail.
test('handles every launch event of the served manifest at once and without network calls', async ({
  page,
  publicApi,
}) => {
  const response = await requestOutlookManifest(publicApi);
  expect(response.status()).toBe(200);
  const functionNames = [
    ...(await response.text()).matchAll(
      /<LaunchEvent Type="\w+" FunctionName="(\w+)"\/>/g,
    ),
  ].map(([, name]) => name);
  expect(functionNames.length).toBeGreaterThan(0);

  await stubOfficeHost(page, {
    composeItem: {
      subject: 'E2E launch events',
      body: 'Hello',
      from: { displayName: 'Alice', emailAddress: 'alice@e2e.local' },
      to: [{ displayName: 'Bob', emailAddress: 'bob@e2e.local' }],
    },
  });
  const registered = await openLaunchEventRuntime(page);
  expect(registered).toEqual(expect.arrayContaining(functionNames));

  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  for (const name of functionNames) {
    expect(await dispatchLaunchEvent(page, name), name).toBe(true);
  }
  expect(await officeItemCalls(page)).toEqual([]);
  expect(requests).toEqual([]);
});
