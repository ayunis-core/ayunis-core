import { useTranslation } from 'react-i18next';
import { Plug } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import type { ToolCallDecision } from '@/shared/api';
import { formatToolName } from '@/pages/chat/lib/format-tool-name';
import { useToolCallConfirmation } from '@/pages/chat/ui/agent-run-timeline/model/tool-call-confirmation';

interface ToolCallConfirmationCardProps {
  toolUse: ToolUseMessageContent;
  /** Present once the call has a result. */
  result?: string;
  decision?: ToolCallDecision;
}

export default function ToolCallConfirmationCard({
  toolUse,
  result,
  decision,
}: Readonly<ToolCallConfirmationCardProps>) {
  const { canDecide, decisionFor } = useToolCallConfirmation();
  const unsent = decisionFor(toolUse.id);
  const unsentDecision = unsent?.approved ? 'confirmed' : 'rejected';
  const shownDecision = decision ?? (unsent ? unsentDecision : undefined);
  const isPending = result === undefined && shownDecision === undefined;
  const integration = toolUse.integration;

  return (
    <Item
      variant="outline"
      className="my-2 w-full"
      data-testid="tool-confirmation"
      data-tool-call-id={toolUse.id}
      data-state={shownDecision ?? (isPending ? 'pending' : 'answered')}
    >
      <ItemMedia variant="icon">
        {integration?.logoUrl ? (
          <img
            src={integration.logoUrl}
            alt=""
            className="size-4 rounded-sm object-contain"
          />
        ) : (
          <Plug />
        )}
      </ItemMedia>
      <ItemContent className="min-w-0">
        {integration && <ItemDescription>{integration.name}</ItemDescription>}
        <ItemTitle>{formatToolName(toolUse.name)}</ItemTitle>
      </ItemContent>
      {shownDecision && (
        <ItemActions>
          <DecisionBadge decision={shownDecision} />
        </ItemActions>
      )}
      <pre className="basis-full max-h-48 overflow-auto rounded-md bg-muted/50 p-2 text-xs font-mono whitespace-pre-wrap break-words">
        {JSON.stringify(toolUse.params, null, 2)}
      </pre>
      {isPending && canDecide && <DecisionActions toolCallId={toolUse.id} />}
    </Item>
  );
}

function DecisionBadge({ decision }: Readonly<{ decision: ToolCallDecision }>) {
  const { t } = useTranslation('chat');
  return (
    <Badge
      variant={decision === 'confirmed' ? 'secondary' : 'outline'}
      data-testid="tool-confirmation-decision"
    >
      {decision === 'confirmed'
        ? t('chat.toolConfirmation.confirmed')
        : t('chat.toolConfirmation.rejected')}
    </Badge>
  );
}

function DecisionActions({ toolCallId }: Readonly<{ toolCallId: string }>) {
  const { t } = useTranslation('chat');
  const { decide } = useToolCallConfirmation();

  return (
    <ItemFooter>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={() =>
            decide({ toolCallId, approved: true, alwaysAllow: true })
          }
          data-testid="tool-confirmation-always-allow"
        >
          {t('chat.toolConfirmation.alwaysAllow')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            decide({ toolCallId, approved: true, alwaysAllow: false })
          }
          data-testid="tool-confirmation-confirm"
        >
          {t('chat.toolConfirmation.confirm')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            decide({ toolCallId, approved: false, alwaysAllow: false })
          }
          data-testid="tool-confirmation-reject"
        >
          {t('chat.toolConfirmation.reject')}
        </Button>
      </div>
    </ItemFooter>
  );
}
