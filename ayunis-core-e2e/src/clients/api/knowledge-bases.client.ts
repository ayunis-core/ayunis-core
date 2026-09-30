import type { APIRequestContext } from '@playwright/test';
import { expect } from '@playwright/test';
import type {
  KnowledgeBaseDocumentResponseDto,
  ReindexIntervalDto,
} from '../generated/ayunisCoreAPI.schemas';
import { generatedApi } from './generated-api';

export async function findKnowledgeBaseDocument(
  api: APIRequestContext,
  knowledgeBaseId: string,
  documentId: string,
): Promise<KnowledgeBaseDocumentResponseDto | undefined> {
  const { data } = await generatedApi.knowledgeBasesControllerListDocuments(
    knowledgeBaseId,
    { api },
  );
  return data.find((document) => document.id === documentId);
}

/** Adds a web page to a knowledge base and waits until its crawl is indexed. */
export async function addReadyWebSource(
  api: APIRequestContext,
  knowledgeBaseId: string,
  url: string,
  reindexInterval?: ReindexIntervalDto,
): Promise<KnowledgeBaseDocumentResponseDto> {
  const created = await generatedApi.knowledgeBasesControllerAddUrl(
    knowledgeBaseId,
    { url, reindexInterval },
    { api },
  );
  await expect
    .poll(
      async () =>
        (await findKnowledgeBaseDocument(api, knowledgeBaseId, created.id))
          ?.status,
      { timeout: 30_000 },
    )
    .toBe('ready');
  return created;
}

export function setDocumentReindexSchedule(
  api: APIRequestContext,
  knowledgeBaseId: string,
  documentId: string,
  reindexInterval: ReindexIntervalDto | null,
): Promise<KnowledgeBaseDocumentResponseDto> {
  return generatedApi.knowledgeBasesControllerSetDocumentReindexSchedule(
    knowledgeBaseId,
    documentId,
    { reindexInterval },
    { api },
  );
}
