import CreateFileWidget from '@/pages/chat/ui/chat-widgets/CreateFileWidget';
import type { ReactNode } from 'react';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import type { ToolCallDecision } from '@/shared/api';
import ToolCallConfirmationCard from '@/pages/chat/ui/agent-run-timeline/ui/ToolCallConfirmationCard';

import SendEmailWidget from '@/pages/chat/ui/chat-widgets/SendEmailWidget';
import CreateCalendarEventWidget from '@/pages/chat/ui/chat-widgets/CreateCalendarEventWidget';
import CreateSkillWidget from '@/pages/chat/ui/chat-widgets/CreateSkillWidget';
import EditSkillWidget from '@/pages/chat/ui/chat-widgets/EditSkillWidget';
import CreateRoutineWidget from '@/pages/chat/ui/chat-widgets/CreateRoutineWidget';
import EditRoutineWidget from '@/pages/chat/ui/chat-widgets/EditRoutineWidget';
import InstallMarketplaceSkillWidget from '@/pages/chat/ui/chat-widgets/InstallMarketplaceSkillWidget';
import GenerateImageWidget from '@/pages/chat/ui/chat-widgets/GenerateImageWidget';
import LazyGeoJsonMapWidget from '@/pages/chat/ui/chat-widgets/LazyGeoJsonMapWidget';
import { renderArtifactToolWidget } from '@/pages/chat/ui/chat-widgets/renderArtifactToolWidget';
import { generatedImageIdFromToolResult } from './generated-image-id';
import {
  BarChartWidget,
  LineChartWidget,
  PieChartWidget,
} from '@/widgets/charts';

interface RenderRichToolCardOptions {
  toolUse: ToolUseMessageContent;
  result?: string;
  decision?: ToolCallDecision;
  isStreaming: boolean;
  threadId?: string;
  onOpenArtifact?: (artifactId: string) => void;
  index: number;
}

// eslint-disable-next-line sonarjs/function-return-type -- returns JSX or null
export function renderRichToolCard({
  toolUse,
  result,
  decision,
  isStreaming,
  threadId,
  onOpenArtifact,
  index,
}: RenderRichToolCardOptions): ReactNode {
  if (toolUse.requiresConfirmation) {
    return (
      <ToolCallConfirmationCard
        toolUse={toolUse}
        result={result}
        decision={decision}
      />
    );
  }
  switch (toolUse.name) {
    case 'create_file':
      return <CreateFileWidget content={toolUse} isStreaming={isStreaming} />;
    case 'send_email':
      return <SendEmailWidget content={toolUse} isStreaming={isStreaming} />;
    case 'create_calendar_event':
      return (
        <CreateCalendarEventWidget
          content={toolUse}
          isStreaming={isStreaming}
        />
      );
    case 'create_skill':
      return (
        <CreateSkillWidget
          content={toolUse}
          isStreaming={isStreaming}
          threadId={threadId}
        />
      );
    case 'edit_skill':
      return (
        <EditSkillWidget
          content={toolUse}
          isStreaming={isStreaming}
          threadId={threadId}
        />
      );
    case 'create_routine':
      return (
        <CreateRoutineWidget content={toolUse} isStreaming={isStreaming} />
      );
    case 'edit_routine':
      return <EditRoutineWidget content={toolUse} isStreaming={isStreaming} />;
    case 'install_marketplace_skill':
      return (
        <InstallMarketplaceSkillWidget
          content={toolUse}
          isStreaming={isStreaming}
          threadId={threadId}
        />
      );
    case 'bar_chart':
      return <BarChartWidget content={toolUse} isStreaming={isStreaming} />;
    case 'line_chart':
      return <LineChartWidget content={toolUse} isStreaming={isStreaming} />;
    case 'pie_chart':
      return <PieChartWidget content={toolUse} isStreaming={isStreaming} />;
    case 'map':
      return (
        <LazyGeoJsonMapWidget content={toolUse} isStreaming={isStreaming} />
      );
    case 'generate_image':
      return (
        <GenerateImageWidget
          content={toolUse}
          imageId={generatedImageIdFromToolResult(result)}
          threadId={threadId}
          isStreaming={isStreaming}
        />
      );
    default: {
      const artifact = renderArtifactToolWidget({
        content: toolUse,
        result,
        index,
        isStreaming,
        threadId: threadId ?? '',
        onOpenArtifact,
      });
      return artifact ?? null;
    }
  }
}
