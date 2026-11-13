import type { ChatAttachment } from '@/features/chat-attachments';
import type { Message, Thread } from '@/pages/chat/model/openapi';
import type { SourceAttachment } from '@/pages/chat/model/source-attachment';
import type {
  AgentRunUnit,
  RenderUnit,
  SourceProcessingTimelineStep,
} from '@/pages/chat/ui/agent-run-timeline';
import type { SourceProcessingProgressDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export interface SourceAttachmentsInput {
  sources: Thread['sources'];
  uploads: ChatAttachment[];
  messages: Message[];
  progress?: SourceProcessingProgressDto[];
}

export function sourceAttachments(
  input: SourceAttachmentsInput,
): SourceAttachment[] {
  const stored = input.sources.map((source) => {
    const progress = input.progress?.find(
      (item) => item.sourceId === source.id,
    );
    let stage: SourceProcessingTimelineStep['stage'] =
      source.status === 'processing'
        ? (progress?.stage ?? 'queued')
        : source.status;
    if (
      input.uploads.some(
        (upload) => upload.removing && upload.sourceIds.includes(source.id),
      )
    )
      stage = 'removing';
    return {
      id: source.id,
      origin: 'source' as const,
      messageId: input.messages.find(
        (message) =>
          message.role === 'user' &&
          Date.parse(message.createdAt) >= Date.parse(source.createdAt),
      )?.id,
      step: processingStep(source.id, source.name, stage, {
        completed: progress?.completed,
        unit: progress?.unit,
        errorCode: source.processingErrorCode,
        isAudio: 'fileType' in source && source.fileType === 'audio',
      }),
    };
  });
  const transferring = input.uploads
    .filter(
      (upload) =>
        upload.submitted &&
        !upload.sourceIds.some((id) =>
          input.sources.some((source) => source.id === id),
        ),
    )
    .map((upload) => ({
      id: upload.id,
      origin: 'upload' as const,
      step: processingStep(upload.id, upload.name, uploadStage(upload), {
        uploadProgress: upload.uploadProgress,
      }),
    }));
  return [...stored, ...transferring];
}

function uploadStage(
  upload: ChatAttachment,
): SourceProcessingTimelineStep['stage'] {
  if (upload.removing) return 'removing';
  if (upload.status === 'failed') return 'failed';
  return upload.uploadProgress === undefined ? 'queued' : 'uploading';
}

function processingStep(
  id: string,
  name: string,
  stage: SourceProcessingTimelineStep['stage'],
  progress: Partial<SourceProcessingTimelineStep>,
): SourceProcessingTimelineStep {
  let status: SourceProcessingTimelineStep['status'] = 'in_progress';
  if (stage === 'ready') status = 'done';
  if (stage === 'failed') status = 'error';
  return {
    ...progress,
    kind: 'source_processing',
    key: `source-${id}`,
    sourceName: name,
    isAudio:
      progress.isAudio ??
      /\.(mp3|wav|m4a|aac|ogg|opus|flac|webm|mp4)$/i.test(name),
    stage,
    status,
  };
}

export function withAttachmentProcessing(
  units: readonly RenderUnit[],
  attachments: SourceAttachment[],
): readonly RenderUnit[] {
  let messageId: string | undefined;
  let firstRun = false;
  return units.map((unit) => {
    if (unit.kind === 'user') {
      messageId = unit.message.id;
      firstRun = true;
      return unit;
    }
    if (!firstRun) return unit;
    firstRun = false;
    const steps = attachments
      .filter((item) => item.messageId === messageId)
      .map((item) => item.step);
    if (steps.length === 0) return unit;
    const first = unit.blocks.at(0);
    const activity =
      first?.kind === 'activity'
        ? { ...first, steps: [...steps, ...first.steps] }
        : { kind: 'activity' as const, key: `processing-${messageId}`, steps };
    return {
      ...unit,
      blocks: [
        activity,
        ...unit.blocks.slice(first?.kind === 'activity' ? 1 : 0),
      ],
    };
  });
}

export function pendingProcessingRun(
  attachments: SourceAttachment[],
  streaming: boolean,
): AgentRunUnit {
  return {
    kind: 'agent-run',
    key: 'attachment-processing',
    isStreaming: streaming,
    blocks: [
      {
        kind: 'activity',
        key: 'attachment-processing-steps',
        steps: attachments.map((item) => item.step),
      },
    ],
  };
}
