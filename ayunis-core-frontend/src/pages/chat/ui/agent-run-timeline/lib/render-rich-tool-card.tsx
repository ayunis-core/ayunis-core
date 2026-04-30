import type { ReactNode } from 'react';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import { ToolAssignmentDtoType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import SendEmailWidget from '@/pages/chat/ui/chat-widgets/SendEmailWidget';
import CreateCalendarEventWidget from '@/pages/chat/ui/chat-widgets/CreateCalendarEventWidget';
import CreateSkillWidget from '@/pages/chat/ui/chat-widgets/CreateSkillWidget';
import EditSkillWidget from '@/pages/chat/ui/chat-widgets/EditSkillWidget';
import GenerateImageWidget from '@/pages/chat/ui/chat-widgets/GenerateImageWidget';
import { renderArtifactToolWidget } from '@/pages/chat/ui/chat-widgets/renderArtifactToolWidget';
import {
  BarChartWidget,
  LineChartWidget,
  PieChartWidget,
} from '@/widgets/charts';

interface RenderRichToolCardOptions {
  toolUse: ToolUseMessageContent;
  result?: string;
  isStreaming: boolean;
  threadId?: string;
  onOpenArtifact?: (artifactId: string) => void;
  index: number;
}

// eslint-disable-next-line sonarjs/function-return-type -- returns JSX or null
export function renderRichToolCard({
  toolUse,
  result,
  isStreaming,
  threadId,
  onOpenArtifact,
  index,
}: RenderRichToolCardOptions): ReactNode {
  switch (toolUse.name) {
    case ToolAssignmentDtoType.send_email:
      return <SendEmailWidget content={toolUse} isStreaming={isStreaming} />;
    case ToolAssignmentDtoType.create_calendar_event:
      return (
        <CreateCalendarEventWidget
          content={toolUse}
          isStreaming={isStreaming}
        />
      );
    case ToolAssignmentDtoType.create_skill:
      return <CreateSkillWidget content={toolUse} isStreaming={isStreaming} />;
    case ToolAssignmentDtoType.edit_skill:
      return <EditSkillWidget content={toolUse} isStreaming={isStreaming} />;
    case ToolAssignmentDtoType.bar_chart:
      return <BarChartWidget content={toolUse} isStreaming={isStreaming} />;
    case ToolAssignmentDtoType.line_chart:
      return <LineChartWidget content={toolUse} isStreaming={isStreaming} />;
    case ToolAssignmentDtoType.pie_chart:
      return <PieChartWidget content={toolUse} isStreaming={isStreaming} />;
    case ToolAssignmentDtoType.generate_image:
      return (
        <GenerateImageWidget
          content={toolUse}
          imageId={result}
          threadId={threadId}
          isStreaming={isStreaming}
        />
      );
    default: {
      const artifact = renderArtifactToolWidget({
        content: toolUse,
        index,
        isStreaming,
        threadId: threadId ?? '',
        onOpenArtifact,
      });
      return artifact ?? null;
    }
  }
}
