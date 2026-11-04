import { request } from '@playwright/test';
import type { APIRequestContext, TestInfo } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { login } from '../../src/clients/api/auth.client';
import { generatedApi } from '../../src/clients/api/generated-api';
import { getEffectiveDefaultModel } from '../../src/clients/api/models.client';
import {
  createEmptyThread,
  sendThreadMessage,
  uploadThreadCsv,
} from '../../src/clients/api/threads.client';
import { createOrg } from '../../src/factories/org.factory';
import { createUser } from '../../src/factories/user.factory';
import { test, expect } from '../../src/fixtures/test';
import { config } from '../../src/config';

let codeExecutionServer: Server | undefined;
let codeExecutionRequestCount = 0;

test.beforeAll(async () => {
  if (process.env.E2E_STUB_CODE_EXECUTION !== 'true') return;
  codeExecutionServer = createServer(async (request, response) => {
    if (request.url !== '/execute') {
      response.writeHead(404).end();
      return;
    }
    codeExecutionRequestCount++;
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
      files?: Record<string, string>;
    };
    const output = Object.values(body.files ?? {})
      .map((content) => Buffer.from(content, 'base64').toString('utf8'))
      .join('\n');
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        success: true,
        output,
        exit_code: 0,
        execution_id: '00000000-0000-4000-8000-000000000001',
        output_files: null,
      }),
    );
  });
  await new Promise<void>((resolve, reject) => {
    codeExecutionServer?.once('error', reject);
    codeExecutionServer?.listen(8080, resolve);
  });
});

test.afterAll(async () => {
  if (!codeExecutionServer) return;
  await new Promise<void>((resolve, reject) => {
    codeExecutionServer?.close((error) => (error ? reject(error) : resolve()));
  });
});

test('code execution accepts only READY CSVs attached to the caller thread', async ({
  api,
  mail,
}, testInfo) => {
  test.setTimeout(120_000);
  const ownerThreadId = await createThread(api);
  const ownerSourceId = await uploadReadyCsv(
    api,
    ownerThreadId,
    'owner-payroll.csv',
    'employee,salary\nOWNER_PRIVATE_SENTINEL,95000',
  );

  const member = await createUser(api, mail, `csv-auth-${Date.now()}`);
  const memberApi = await request.newContext({ baseURL: config.apiURL });
  try {
    await login(memberApi, member.email, member.password);
    const memberThreadId = await createThread(memberApi);

    await expectDenied(
      memberApi,
      memberThreadId,
      ownerSourceId,
      'OWNER_PRIVATE_SENTINEL',
    );

    const memberSourceId = await uploadReadyCsv(
      memberApi,
      memberThreadId,
      'member-budget.csv',
      'department,amount\nMEMBER_ATTACHED_SENTINEL,120000',
    );
    const allowed = await runCodeExecution(
      memberApi,
      memberThreadId,
      memberSourceId,
    );
    expect(allowed.ok()).toBe(true);
    expect(await allowed.text()).toContain('MEMBER_ATTACHED_SENTINEL');

    const foreignSourceId = await createForeignOrgSource(testInfo);
    await expectDenied(
      memberApi,
      memberThreadId,
      foreignSourceId,
      'FOREIGN_ORG_PRIVATE_SENTINEL',
    );
  } finally {
    await memberApi.dispose();
  }
});

async function createThread(api: APIRequestContext): Promise<string> {
  const defaultModel = await getEffectiveDefaultModel(api);
  if (!defaultModel) throw new Error('No default model is configured');
  return (await createEmptyThread(api, defaultModel.id)).id;
}

async function uploadReadyCsv(
  api: APIRequestContext,
  threadId: string,
  filename: string,
  csv: string,
): Promise<string> {
  const upload = await uploadThreadCsv(api, threadId, filename, csv);
  expect(upload.ok()).toBe(true);
  const [created] = (await upload.json()) as { id: string }[];
  if (!created) throw new Error(`CSV upload ${filename} returned no source`);
  await expect
    .poll(
      async () =>
        (
          await generatedApi.threadSourcesControllerGetThreadSources(threadId, {
            api,
          })
        ).find((source) => source.id === created.id)?.status,
      { timeout: 30_000 },
    )
    .toBe('ready');
  return created.id;
}

async function expectDenied(
  api: APIRequestContext,
  threadId: string,
  sourceId: string,
  privateSentinel: string,
): Promise<void> {
  const requestCountBefore = codeExecutionRequestCount;
  const response = await runCodeExecution(api, threadId, sourceId);
  expect(response.ok()).toBe(true);
  const responseText = await response.text();
  expect(responseText).toContain('not attached to this conversation');
  expect(responseText).not.toContain(privateSentinel);
  if (codeExecutionServer) {
    expect(codeExecutionRequestCount).toBe(requestCountBefore);
  }
}

function runCodeExecution(
  api: APIRequestContext,
  threadId: string,
  sourceId: string,
) {
  return sendThreadMessage(
    api,
    threadId,
    `E2E code execution sources: ${JSON.stringify([sourceId])}`,
  );
}

async function createForeignOrgSource(testInfo: TestInfo): Promise<string> {
  const storageState = testInfo.outputPath('foreign-org.json');
  const foreignOrg = await createOrg(`csv-foreign-${Date.now()}`, storageState);
  const foreignApi = await request.newContext({
    baseURL: config.apiURL,
    storageState: foreignOrg.storageState,
  });
  try {
    const threadId = await createThread(foreignApi);
    return await uploadReadyCsv(
      foreignApi,
      threadId,
      'foreign-payroll.csv',
      'employee,salary\nFOREIGN_ORG_PRIVATE_SENTINEL,99000',
    );
  } finally {
    await foreignApi.dispose();
  }
}
