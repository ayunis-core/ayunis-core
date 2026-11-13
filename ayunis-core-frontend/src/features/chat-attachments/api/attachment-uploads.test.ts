import { QueryClient } from '@tanstack/react-query';
import { expect, it } from 'vitest';
import { getThreadsControllerFindOneQueryKey } from '@/shared/api/generated/ayunisCoreAPI';
import type {
  GetThreadResponseDto,
  SourceResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { refreshAttachmentSources } from './attachment-uploads';

it('keeps navigation alive and preserves completed sources when an older thread load finishes later', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const queryKey = getThreadsControllerFindOneQueryKey('thread-1');
  let resolve!: (thread: GetThreadResponseDto) => void;
  const oldThread = new Promise<GetThreadResponseDto>((done) => {
    resolve = done;
  });
  const navigation = client.query({ queryKey, queryFn: () => oldThread });
  const source = { id: 'source-1', status: 'processing' } as SourceResponseDto;
  const completion = refreshAttachmentSources(client, 'thread-1', [source]);
  resolve({ id: 'thread-1', sources: [] } as unknown as GetThreadResponseDto);
  await expect(navigation).resolves.toMatchObject({ id: 'thread-1' });
  await completion;
  expect(client.getQueryData<GetThreadResponseDto>(queryKey)?.sources).toEqual([
    source,
  ]);
  client.clear();
});
