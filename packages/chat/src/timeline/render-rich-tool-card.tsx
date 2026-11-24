import type { ReactNode } from 'react';
import type { ToolCallDecision } from '@ayunis/api-client';
import type { ToolCardProps } from '@ayunis/chat/tool-cards';
import ToolCallConfirmationCard from './ToolCallConfirmationCard';
import type { ToolCards } from './tool-card-types';

interface RenderRichToolCardOptions extends ToolCardProps {
  readonly decision?: ToolCallDecision;
}

// eslint-disable-next-line sonarjs/function-return-type -- absence of a card is represented by null
export function renderRichToolCard(
  toolCards: ToolCards,
  { decision, ...props }: RenderRichToolCardOptions,
): ReactNode {
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

  const Card = toolCards.get(toolUse.name)?.render;
  return Card ? <Card {...props} /> : null;
}
