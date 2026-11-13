import { describe, expect, it } from 'vitest';
import type { ChatAttachment } from '@/features/chat-attachments';
import type { Message, Thread } from '@/pages/chat/model/openapi';
import type {
  RenderUnit,
  TimelineStep,
  SourceProcessingTimelineStep,
} from '@/pages/chat/ui/agent-run-timeline';
import type { SourceAttachment } from '@/pages/chat/model/source-attachment';
import {
  sourceAttachments,
  withAttachmentProcessing,
} from './source-attachments';

const processing: SourceProcessingTimelineStep = {
  kind: 'source_processing',
  key: 'source-1',
  sourceName: 'budget.pdf',
  stage: 'ready',
  status: 'done',
  isAudio: false,
};
const thinking: TimelineStep = {
  kind: 'thinking',
  key: 'thinking-1',
  transcript: 'Reading the budget',
  status: 'in_progress',
};
const user: RenderUnit = {
  kind: 'user',
  key: 'user-1',
  message: { id: 'user-1' } as Message,
};
const attachment: SourceAttachment = {
  id: 'source-1',
  origin: 'source',
  messageId: 'user-1',
  step: processing,
};
const run: RenderUnit = {
  kind: 'agent-run',
  key: 'run-1',
  isStreaming: true,
  blocks: [{ kind: 'activity', key: 'activity-1', steps: [thinking] }],
};

describe(withAttachmentProcessing.name, () => {
  it('keeps processing and model activity together in chronological order', () => {
    const result = withAttachmentProcessing([user, run], [attachment]);
    expect(result[1]).toMatchObject({
      blocks: [{ kind: 'activity', steps: [processing, thinking] }],
    });
    expect(run).toMatchObject({ blocks: [{ steps: [thinking] }] });
  });
  it('adds processing before an answer that has no model activity and does not repeat it on continuations', () => {
    const answer: RenderUnit = {
      kind: 'agent-run',
      key: 'answer-1',
      isStreaming: false,
      blocks: [],
    };
    const result = withAttachmentProcessing([user, answer, run], [attachment]);
    expect(result[1]).toMatchObject({
      blocks: [{ kind: 'activity', steps: [processing] }],
    });
    expect(result[2]).toBe(run);
  });
  it('leaves conversations without attachments unchanged', () => {
    expect(withAttachmentProcessing([user, run], [])).toEqual([user, run]);
  });
});

it('keeps removal in progress when a completed upload becomes a stored source', () => {
  const source = {
    id: 'source-1',
    name: 'budget.pdf',
    status: 'processing',
    createdAt: '2026-11-13T12:00:00Z',
  } as unknown as Thread['sources'][number];
  const upload: ChatAttachment = {
    id: 'upload-1',
    scope: 'thread-1',
    name: 'budget.pdf',
    type: 'text',
    submitted: true,
    status: 'processing',
    sourceIds: ['source-1'],
    removing: true,
  };
  const result = sourceAttachments({
    sources: [source],
    uploads: [upload],
    messages: [],
  });
  expect(result).toHaveLength(1);
  expect(result[0].step.stage).toBe('removing');
});
