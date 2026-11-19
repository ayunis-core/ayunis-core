import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getKnowledgeBasesControllerListDocumentsQueryKey,
  getKnowledgeBaseSyncedLocationsControllerListQueryKey,
  useKnowledgeBasesControllerListDocuments,
  useKnowledgeBaseSyncedLocationsControllerList,
} from '@/shared/api/generated/ayunisCoreAPI';
import type {
  KnowledgeBaseDocumentListResponseDto,
  SyncedLocationListResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useRemoveSyncedLocation } from './useRemoveSyncedLocation';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('@/shared/api/client', () => ({ customAxiosInstance: request }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/shared/lib/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

const KNOWLEDGE_BASE_ID = 'knowledge-base-id';
const LOCATION_ID = 'location-id';

let client: QueryClient;
let server: {
  locations: { id: string }[];
  documents: { id: string; syncedLocationId: string | null }[];
};

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function delayed<T>(ms: number, value: () => T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value()), ms));
}

beforeEach(() => {
  vi.useFakeTimers();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  server = {
    locations: [{ id: LOCATION_ID }],
    documents: [
      { id: 'synced-document', syncedLocationId: LOCATION_ID },
      { id: 'uploaded-document', syncedLocationId: null },
    ],
  };
  request.mockImplementation(
    ({ url, method }: { url: string; method: string }) => {
      const base = `/knowledge-bases/${KNOWLEDGE_BASE_ID}`;
      if (method === 'DELETE') {
        server.locations = [];
        server.documents = server.documents.filter(
          (document) => document.syncedLocationId !== LOCATION_ID,
        );
        return Promise.resolve(undefined);
      }
      if (url === `${base}/synced-locations`)
        return delayed(10, () => ({
          data: server.locations,
          availableProducts: [],
        }));
      // The documents list answers slower than the locations.
      if (url === `${base}/documents`)
        return delayed(200, () => ({ data: server.documents }));
      return Promise.resolve(undefined);
    },
  );
});

afterEach(() => {
  cleanup();
  client.clear();
  vi.useRealTimers();
});

describe('useRemoveSyncedLocation', () => {
  it('never shows the documents of a removed location as loose documents', async () => {
    const { result } = renderHook(
      () => ({
        locations:
          useKnowledgeBaseSyncedLocationsControllerList(KNOWLEDGE_BASE_ID).data,
        documents:
          useKnowledgeBasesControllerListDocuments(KNOWLEDGE_BASE_ID).data,
        remove: useRemoveSyncedLocation(KNOWLEDGE_BASE_ID),
      }),
      { wrapper },
    );
    await act(() => vi.advanceTimersByTimeAsync(500));
    const loose: string[] = [];
    const unsubscribe = client.getQueryCache().subscribe(() => {
      const locations = client.getQueryData<SyncedLocationListResponseDto>(
        getKnowledgeBaseSyncedLocationsControllerListQueryKey(
          KNOWLEDGE_BASE_ID,
        ),
      );
      const documents =
        client.getQueryData<KnowledgeBaseDocumentListResponseDto>(
          getKnowledgeBasesControllerListDocumentsQueryKey(KNOWLEDGE_BASE_ID),
        );
      const listed = new Set(locations?.data.map(({ id }) => id));
      for (const document of documents?.data ?? [])
        if (document.syncedLocationId && !listed.has(document.syncedLocationId))
          loose.push(document.id);
    });

    act(() => result.current.remove.removeLocation(LOCATION_ID));
    await act(() => vi.advanceTimersByTimeAsync(1_000));
    unsubscribe();

    expect(result.current.locations?.data).toEqual([]);
    expect(result.current.documents?.data.map(({ id }) => id)).toEqual([
      'uploaded-document',
    ]);
    expect(loose).toEqual([]);
  });
});
