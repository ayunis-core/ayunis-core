import type { ReactNode } from 'react';
import type { ToolCallDecision } from '@ayunis/api-client';
import type { ToolCardProps } from '@ayunis/chat/tool-cards';
import ToolCallConfirmationCard from '@/pages/chat/ui/agent-run-timeline/ui/ToolCallConfirmationCard';
import { chatToolCards } from './tool-card-registrations';

interface RenderRichToolCardOptions extends ToolCardProps {
  readonly decision?: ToolCallDecision;
}

// eslint-disable-next-line sonarjs/function-return-type -- absence of a card is represented by null
export function renderRichToolCard({
  decision,
  ...props
}: RenderRichToolCardOptions): ReactNode {
  const { toolUse, result } = props;
  if (toolUse.requiresConfirmation) {
    return (
      <ToolCallConfirmationCard
        toolUse={toolUse}
        result={result}
        decision={decision}
      />
    );
  }

  const Card = chatToolCards.get(toolUse.name)?.render;
  return Card ? <Card {...props} /> : null;
}
