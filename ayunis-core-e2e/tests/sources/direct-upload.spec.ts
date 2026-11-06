import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from '../../src/fixtures/test';
import { generatedApi } from '../../src/clients/api/generated-api';
import { login } from '../../src/clients/api/auth.client';
import { createUser } from '../../src/factories/user.factory';
import { createOcrRejectedPdf } from '../../src/factories/pdf.factory';
import { sendMessage, startThread } from '../../src/flows/chat.flow';
import { config } from '../../src/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createEmptyThread } from '../../src/clients/api/threads.client';
import { getEffectiveDefaultModel } from '../../src/clients/api/models.client';

const workbookPath = fileURLToPath(
  new URL('../../fixtures/two-sheet-workbook.xlsx', import.meta.url),
);

const BUDGET = 'Haushalt 2026: Gesamtvolumen EUR 4.200.000';

// Pre-signed storage URLs carry the signature in the query; the API never does.
const isSignedStorageRequest = (url: string) => url.includes('X-Amz-Signature');

test('uploads chat files straight to object storage and shows transfer apart from processing', async ({
  api,
  page,
}) => {
  test.setTimeout(90_000);
  await permitEmbeddingModel(api);
  const threadId = await startThread(page, 'Prepare to review the attached budget.');
  let releaseRefresh!: () => void;
  let markRefreshStarted!: () => void;
  const refreshHeld = new Promise<void>(resolve => { releaseRefresh = resolve; });
  const refreshStarted = new Promise<void>(resolve => { markRefreshStarted = resolve; });
  await page.route(url => url.pathname === `/api/threads/${threadId}`, async route => {
    if (route.request().method() === 'GET') {
      markRefreshStarted();
      await refreshHeld;
    }
    await route.continue();
  });
  let completedTransfers = 0;
  page.on('response', response => {
    if (response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/complete')) completedTransfers += 1;
  });

  // Hold every storage PUT so the transfer state is observable for both files.
  let releaseTransfer!: () => void;
  const transferHeld = new Promise<void>((resolve) => {
    releaseTransfer = resolve;
  });
  await page.route(
    (url) => isSignedStorageRequest(url.href),
    async (route) => {
      if (route.request().method() === 'PUT') await transferHeld;
      await route.continue();
    },
  );
  const storagePut = page.waitForRequest(
    (request) =>
      request.method() === 'PUT' && isSignedStorageRequest(request.url()),
  );

  await uploadPdfs(page, ['haushalt-2026.pdf', 'haushalt-anlage.pdf']);

  const put = await storagePut;
  expect(new URL(put.url()).origin).not.toBe(new URL(config.apiURL).origin);
  expect(new URL(put.url()).searchParams.get('X-Amz-SignedHeaders')).toContain('content-length');
  await expect(
    page
      .getByTestId('chat-source')
      .and(page.locator('[data-source-status="uploading"]')),
  ).toHaveCount(2);
  const continuity = await page.evaluateHandle(() => {
    const state = { missing: false };
    const observer = new MutationObserver(() => {
      if (document.querySelectorAll('[data-testid="chat-source"]').length === 0) state.missing = true;
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return { state, observer };
  });
  releaseTransfer();
  try {
    await refreshStarted;
    await expect.poll(() => completedTransfers).toBe(2);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
    await expect(page.getByTestId('chat-source')).toHaveCount(2);
    expect(await continuity.evaluate(({ state }) => state.missing)).toBe(false);
  } finally {
    releaseRefresh();
  }

  await expect(
    page
      .getByTestId('chat-source')
      .and(page.locator('[data-source-status="ready"]')),
  ).toHaveCount(2, { timeout: 60_000 });
  await expect(page.getByTestId('chat-source')).toHaveCount(2);
  expect(await continuity.evaluate(({ state }) => state.missing)).toBe(false);
  await continuity.evaluate(({ observer }) => observer.disconnect());
  await continuity.dispose();
});

test('aborts a new-chat upload after signing fails and preserves the failed chip', async ({ api, page }) => {
  await permitEmbeddingModel(api);
  await page.goto('/chat');
  await uploadPdfs(page, ['interrupted-budget.pdf']);
  const reservation = page.waitForResponse(response =>
    response.request().method() === 'POST' && /^\/api\/threads\/[^/]+\/uploads$/.test(new URL(response.url()).pathname),
  );
  const cleaned = page.waitForResponse(response =>
    response.request().method() === 'DELETE' && new URL(response.url()).pathname.startsWith('/api/source-uploads/'),
  );
  await page.route(url => url.pathname.startsWith('/api/source-uploads/') && url.pathname.endsWith('/sign'), route => route.fulfill({
    status: 410, contentType: 'application/json', body: JSON.stringify({ code: 'SOURCE_UPLOAD_EXPIRED', message: 'Upload expired' }),
  }));
  await sendMessage(page, 'Review the attached budget.');
  const reserved = await reservation;
  const session = await reserved.json() as { id: string };
  const threadId = new URL(reserved.url()).pathname.split('/').at(-2)!;
  try {
    const aborted = await cleaned;
    expect(aborted.status()).toBe(204);
    expect(new URL(aborted.url()).pathname).toBe(`/api/source-uploads/${session.id}`);
    await expect(page.getByTestId('chat-source')).toHaveAttribute('data-source-status', 'failed');
    expect(new URL(page.url()).pathname).toBe('/chat');
    const signAgain = await api.post(`/api/source-uploads/${session.id}/sign`, { data: { method: 'PUT' } });
    expect(signAgain.status()).toBe(410);
  } finally {
    await generatedApi.threadsControllerDelete(threadId, { api });
  }
});

test('rejects bad uploads, hides sessions from other users, and completes idempotently', async ({
  api,
  browser,
  mail,
}) => {
  test.setTimeout(90_000);
  await permitEmbeddingModel(api);
  const knowledgeBase = await generatedApi.knowledgeBasesControllerCreate(
    { ownerType: 'personal', name: `Direct uploads ${Date.now()}` },
    { api },
  );
  const uploadsUrl = `/api/knowledge-bases/${knowledgeBase.id}/uploads`;

  const unsupported = await api.post(uploadsUrl, {
    data: { fileName: 'setup.exe', mimeType: 'application/octet-stream', fileSize: 10 },
  });
  expect(unsupported.status()).toBe(400);
  const tooLarge = await api.post(uploadsUrl, {
    data: { fileName: 'huge.pdf', mimeType: 'application/pdf', fileSize: 26 * 1024 * 1024 },
  });
  expect(tooLarge.status()).toBe(413);
  expect((await tooLarge.json()).code).toBe('FILE_TOO_LARGE');

  const pdf = createOcrRejectedPdf(BUDGET);
  const session = await generatedApi.knowledgeBaseUploadsControllerCreateUpload(
    knowledgeBase.id,
    { fileName: 'haushalt.pdf', mimeType: 'application/pdf', fileSize: pdf.length },
    { api },
  );
  expect(session.multipart).toBe(false);

  // Another user of the same organisation must neither sign nor complete it.
  const member = await createUser(api, mail, `direct-upload-${Date.now()}`);
  const memberContext = await browser.newContext({ baseURL: config.apiURL });
  try {
    await login(memberContext.request, member.email, member.password);
    const sign = await memberContext.request.post(
      `/api/source-uploads/${session.id}/sign`,
      { data: { method: 'PUT' } },
    );
    expect(sign.status()).toBe(404);
    const complete = await memberContext.request.post(
      `${uploadsUrl}/${session.id}/complete`,
    );
    expect([403, 404]).toContain(complete.status());
  } finally {
    await memberContext.close();
  }

  // Nothing has been transferred yet, so completion is refused and nothing is created.
  const early = await api.post(`${uploadsUrl}/${session.id}/complete`);
  expect(early.status()).toBe(409);
  expect((await early.json()).code).toBe('SOURCE_UPLOAD_INCOMPLETE');

  const signed = await generatedApi.sourceUploadsControllerSign(
    session.id,
    { method: 'PUT' },
    { api },
  );
  const oversized = await api.fetch(signed.url, {
    method: 'PUT',
    data: Buffer.concat([pdf, Buffer.from('extra bytes')]),
    headers: { 'content-type': 'application/pdf' },
  });
  expect(oversized.status()).toBe(403);

  const stored = await api.fetch(signed.url, {
    method: 'PUT',
    data: pdf,
    headers: { 'content-type': 'application/pdf' },
  });
  expect(stored.ok()).toBe(true);

  const first = await generatedApi.knowledgeBaseUploadsControllerCompleteUpload(
    knowledgeBase.id,
    session.id,
    { api },
  );
  const again = await generatedApi.knowledgeBaseUploadsControllerCompleteUpload(
    knowledgeBase.id,
    session.id,
    { api },
  );
  expect(again.id).toBe(first.id);

  await expect
    .poll(
      async () =>
        (
          await generatedApi.knowledgeBasesControllerListDocuments(
            knowledgeBase.id,
            { api },
          )
        ).data.map((document) => [document.id, document.status]),
      { timeout: 60_000 },
    )
    .toEqual([[first.id, 'ready']]);

  // The signing endpoint closes once the upload is complete.
  const late = await api.post(`/api/source-uploads/${session.id}/sign`, {
    data: { method: 'PUT' },
  });
  expect(late.status(), await late.text()).toBe(410);
});

test('transfers a file above the multipart threshold in signed parts', async ({
  api,
  page,
}) => {
  test.setTimeout(120_000);
  await permitEmbeddingModel(api);
  await startThread(page, 'Prepare to review the attached budget.');
  const storageRequests: string[] = [];
  page.on('request', (request) => {
    if (isSignedStorageRequest(request.url())) {
      const url = new URL(request.url());
      storageRequests.push(
        `${request.method()} ${[...url.searchParams.keys()]
          .filter((key) => ['uploads', 'uploadId', 'partNumber'].includes(key))
          .map((key) => `${key}=${url.searchParams.get(key)}`)
          .join('&')}`,
      );
    }
  });

  // 9 MiB: one full 8 MiB part plus a remainder, so two signed part PUTs.
  const big = Buffer.concat([
    createOcrRejectedPdf(BUDGET),
    Buffer.alloc(9 * 1024 * 1024, 0x20),
  ]);
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
  await page.getByRole('menuitem').first().click();
  await (await chooser).setFiles([
    { name: 'haushalt-gross.pdf', mimeType: 'application/pdf', buffer: big },
  ]);
  await expect(page.getByRole('menu')).toBeHidden();

  await expect(
    page
      .getByTestId('chat-source')
      .and(page.locator('[data-source-status="ready"]')),
  ).toHaveCount(1, { timeout: 90_000 });

  expect(storageRequests.some((r) => r.startsWith('POST uploads='))).toBe(true);
  const parts = storageRequests
    .filter((r) => r.startsWith('PUT '))
    .map((r) => /partNumber=(\d+)/.exec(r)?.[1]);
  expect(parts).toEqual(['1', '2']);
  expect(
    storageRequests.some((r) => r.startsWith('POST uploadId=') && !r.includes('partNumber')),
  ).toBe(true);
});

test('serves thread uploads through the API and keeps a session on its own thread and user', async ({
  api,
  browser,
  mail,
}) => {
  test.setTimeout(90_000);
  const defaultModel = await requireDefaultModel(api);
  const threadA = await createEmptyThread(api, defaultModel.id);
  const threadB = await createEmptyThread(api, defaultModel.id);
  const workbook = await readFile(workbookPath);
  const session = await generatedApi.threadSourcesControllerCreateUpload(
    threadA.id,
    {
      fileName: 'haushalt.xlsx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileSize: workbook.length,
    },
    { api },
  );

  // A colleague cannot reserve an upload on a thread that is not theirs.
  const member = await createUser(api, mail, `thread-upload-${Date.now()}`);
  const memberContext = await browser.newContext({ baseURL: config.apiURL });
  try {
    await login(memberContext.request, member.email, member.password);
    const foreign = await memberContext.request.post(
      `/api/threads/${threadA.id}/uploads`,
      { data: { fileName: 'x.pdf', mimeType: 'application/pdf', fileSize: 10 } },
    );
    expect(foreign.status()).toBe(404);
  } finally {
    await memberContext.close();
  }

  const signed = await generatedApi.sourceUploadsControllerSign(
    session.id,
    { method: 'PUT' },
    { api },
  );
  const stored = await api.fetch(signed.url, { method: 'PUT', data: workbook });
  expect(stored.ok()).toBe(true);

  // The session was reserved for thread A; thread B must not claim it.
  const mismatch = await api.post(
    `/api/threads/${threadB.id}/uploads/${session.id}/complete`,
  );
  expect(mismatch.status()).toBe(400);
  expect((await mismatch.json()).code).toBe('SOURCE_UPLOAD_TARGET_MISMATCH');

  const sources = await generatedApi.threadSourcesControllerCompleteUpload(
    threadA.id,
    session.id,
    { api },
  );
  expect(sources).toHaveLength(2);
  const thread = await generatedApi.threadsControllerFindOne(threadA.id, { api });
  expect(thread.sources.map((source) => source.id).sort()).toEqual(
    sources.map((source) => source.id).sort(),
  );
});

async function requireDefaultModel(api: APIRequestContext) {
  const defaultModel = await getEffectiveDefaultModel(api);
  if (!defaultModel) throw new Error('No default model is configured');
  return defaultModel;
}

async function permitEmbeddingModel(api: APIRequestContext): Promise<void> {
  const models = await generatedApi.modelsControllerGetAvailableEmbeddingModels(
    { api },
  );
  const model = models[0];
  if (!model) throw new Error('No embedding model available');
  if (model.permittedModelId) return;
  await generatedApi.modelsControllerCreatePermittedModel(
    { modelId: model.modelId },
    { api },
  );
}

async function uploadPdfs(page: Page, names: string[]): Promise<void> {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
  await page.getByRole('menuitem').first().click();
  await (
    await chooser
  ).setFiles(
    names.map((name) => ({
      name,
      mimeType: 'application/pdf',
      buffer: createOcrRejectedPdf(BUDGET),
    })),
  );
  await expect(page.getByRole('menu')).toBeHidden();
}
