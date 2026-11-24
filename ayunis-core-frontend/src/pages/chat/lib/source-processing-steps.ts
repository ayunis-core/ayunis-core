import type { Thread } from '@/pages/chat/model/openapi';
import type {
  AgentRunUnit,
  SourceProcessingTimelineStep,
} from '@/pages/chat/ui/agent-run-timeline';
import type { SourceProcessingProgressDto } from '@ayunis/api-client/schemas';

/** One step per file that is still being processed. */
export function sourceProcessingSteps(
  sources: Thread['sources'],
  progress: SourceProcessingProgressDto[] = [],
): SourceProcessingTimelineStep[] {
  return sources
    .filter((source) => source.status === 'processing')
    .map((source) => {
      const reported = progress.find((item) => item.sourceId === source.id);
      return {
        kind: 'source_processing',
        key: `source-${source.id}`,
        sourceName: source.name,
        isAudio: 'fileType' in source && source.fileType === 'audio',
        stage: reported?.stage ?? 'queued',
        completed: reported?.completed,
        unit: reported?.unit,
        status: 'in_progress',
      };
    });
}

export function sourceProcessingRun(
  steps: SourceProcessingTimelineStep[],
): AgentRunUnit {
  return {
    kind: 'agent-run',
    key: 'source-processing',
    isStreaming: true,
    blocks: [{ kind: 'activity', key: 'source-processing-steps', steps }],
  };
}
