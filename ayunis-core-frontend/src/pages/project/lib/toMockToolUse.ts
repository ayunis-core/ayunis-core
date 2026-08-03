import type { ToolUseMessageContentResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { ProjectDocument } from '@/entities/project';

export function toMockToolUse(
  document: ProjectDocument,
): ToolUseMessageContentResponseDto {
  const params =
    document.kind === 'chart' ? { ...document.chart } : { ...document.email };

  return {
    type: 'tool_use',
    id: document.id,
    name: document.kind === 'chart' ? 'bar_chart' : 'send_email',
    params,
  };
}
