import { request as apiRequest } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { expect, test } from '../../src/fixtures/test';
import { config } from '../../src/config';
import { handOffSessionToOutlook } from '../../src/clients/api/session-tokens.client';
import { createEmptyThread } from '../../src/clients/api/threads.client';
import { getEffectiveDefaultModel } from '../../src/clients/api/models.client';
import { createPdf } from '../../src/factories/pdf.factory';
import { generatedApi } from '../../src/clients/api/generated-api';

/** Reserving an upload resolves one, and a worker org starts without it. */
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

async function defaultModelId(api: APIRequestContext): Promise<string> {
  const model = await getEffectiveDefaultModel(api);
  if (!model) throw new Error('No default model is configured');
  return model.id;
}

/**
 * The pane reads a PDF attachment by uploading it as a source of the chat,
 * through the same direct-upload flow the web app uses: reserve on the thread,
 * sign, transfer to storage, complete. Every API call here runs on the pane's
 * bearer token, so it also covers the routes opened to that client.
 */
test('a pane session uploads an attachment through the direct-upload flow', async ({
  api,
}) => {
  test.setTimeout(90_000);
  await permitEmbeddingModel(api);
  const { accessToken } = await handOffSessionToOutlook(api);
  const modelId = await defaultModelId(api);
  const pdf = createPdf('Haushalt 2026', 'AYC-1591-PANE-UPLOAD');

  const pane = await apiRequest.newContext({
    baseURL: config.apiURL,
    // No cookies: the backend prefers an access-token cookie over the bearer
    // header, so a leaked one would authenticate this as a browser session.
    storageState: { cookies: [], origins: [] },
    extraHTTPHeaders: { Authorization: `Bearer ${accessToken}` },
  });
  try {
    const thread = await createEmptyThread(pane, modelId);
    const reserved = await pane.post(
      `${config.apiURL}/api/threads/${thread.id}/uploads`,
      {
        data: {
          fileName: 'Haushalt.pdf',
          mimeType: 'application/pdf',
          fileSize: pdf.byteLength,
        },
      },
    );
    expect(reserved.status()).toBe(201);
    const session = (await reserved.json()) as {
      id: string;
      multipart: boolean;
    };
    expect(session.multipart).toBe(false);

    const signed = await pane.post(
      `${config.apiURL}/api/source-uploads/${session.id}/sign`,
      { data: { method: 'PUT' } },
    );
    expect(signed.ok()).toBe(true);
    const { url } = (await signed.json()) as { url: string };

    // The transfer goes to object storage, not the API: it must carry only
    // the URL's signature, so it cannot use the pane context's bearer header.
    const stored = await api.fetch(url, {
      method: 'PUT',
      data: pdf,
      headers: { 'content-type': 'application/pdf' },
    });
    expect(stored.ok()).toBe(true);

    const completed = await pane.post(
      `${config.apiURL}/api/threads/${thread.id}/uploads/${session.id}/complete`,
    );
    expect(completed.ok()).toBe(true);
    const sources = (await completed.json()) as { id: string; name: string }[];
    expect(sources.map((source) => source.name)).toContain('Haushalt.pdf');

    // Whether the document then extracts is the processing pipeline's job and
    // is covered by tests/sources/direct-upload.spec.ts; what matters here is
    // that the upload attached it and the pane can read it back.
    const listed = await pane.get(
      `${config.apiURL}/api/threads/${thread.id}/sources`,
    );
    expect(listed.ok()).toBe(true);
    const all = (await listed.json()) as { id: string }[];
    expect(all.map(({ id }) => id)).toContain(sources[0].id);
  } finally {
    await pane.dispose();
  }
});
