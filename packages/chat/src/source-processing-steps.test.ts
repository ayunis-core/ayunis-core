import { expect, it } from 'vitest';
import type { GetThreadResponseDto } from '@ayunis/api-client/schemas';
import { sourceProcessingSteps } from './source-processing-steps';

const source = (update: object) =>
  ({
    id: 'source-1',
    name: 'budget.pdf',
    status: 'processing',
    ...update,
  }) as unknown as GetThreadResponseDto['sources'][number];

it('lists a file being read with the pages the worker reported', () => {
  const steps = sourceProcessingSteps(
    [
      source({}),
      source({ id: 'source-2', name: 'minutes.wav', fileType: 'audio' }),
    ],
    [
      {
        sourceId: 'source-1',
        stage: 'extracting',
        completed: 12,
        unit: 'pages',
      },
    ],
  );

  expect(steps).toMatchObject([
    {
      sourceName: 'budget.pdf',
      stage: 'extracting',
      completed: 12,
      unit: 'pages',
      status: 'in_progress',
      isAudio: false,
    },
    { sourceName: 'minutes.wav', stage: 'queued', isAudio: true },
  ]);
});

it.each(['ready', 'failed', 'reindexing'])(
  'leaves out a file that is %s, so the progress ends with the work',
  (status) => {
    expect(sourceProcessingSteps([source({ status })])).toEqual([]);
  },
);
