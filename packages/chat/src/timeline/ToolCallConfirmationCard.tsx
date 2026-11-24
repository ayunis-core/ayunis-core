import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plug } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import { Checkbox } from '@ayunis/ui/components/checkbox';
import { Label } from '@ayunis/ui/components/label';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import type { ToolUseMessageContentResponseDto as ToolUseMessageContent } from '@ayunis/api-client/schemas';
import type { ToolCallDecision } from '@ayunis/api-client';
import { upstreamToolName } from './format-tool-name';
import { useToolCallConfirmation } from './tool-call-confirmation';

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
  const shownDecision =
    decision ?? pendingDecision(decisionFor(toolUse.id)?.approved);
  const state =
    shownDecision ?? (result === undefined ? 'pending' : 'answered');
  const integration = toolUse.integration;

  return (
    <Item
      variant="outline"
      className="my-2 w-full"
      data-testid="tool-confirmation"
      data-tool-call-id={toolUse.id}
      data-state={state}
    >
      <ItemMedia variant="icon">
        <IntegrationIcon logoUrl={integration?.logoUrl ?? undefined} />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ToolIdentity toolUse={toolUse} />
      </ItemContent>
      {shownDecision && (
        <ItemActions>
          <DecisionBadge decision={shownDecision} />
        </ItemActions>
      )}
      <pre className="basis-full max-h-48 overflow-auto rounded-md bg-muted/50 p-2 text-xs font-mono whitespace-pre-wrap break-words">
        {JSON.stringify(toolUse.params, null, 2)}
      </pre>
      {state === 'pending' && canDecide && (
        <DecisionActions toolCallId={toolUse.id} />
      )}
    </Item>
  );
}

function ToolIdentity({
  toolUse,
}: Readonly<{ toolUse: ToolUseMessageContent }>) {
  return (
    <>
      {toolUse.integration && (
        <ItemDescription>{toolUse.integration.name}</ItemDescription>
      )}
      <ItemTitle className="font-mono">
        {upstreamToolName(toolUse.name)}
      </ItemTitle>
    </>
  );
}

function pendingDecision(
  approved: boolean | undefined,
): ToolCallDecision | undefined {
  if (approved === undefined) return undefined;
  return approved ? 'confirmed' : 'rejected';
}

function IntegrationIcon({ logoUrl }: Readonly<{ logoUrl?: string }>) {
  return logoUrl ? (
    <img src={logoUrl} alt="" className="size-4 rounded-sm object-contain" />
  ) : (
    <Plug />
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
  const [alwaysAllow, setAlwaysAllow] = useState(false);
  const checkboxId = useId();

  return (
    <ItemFooter className="flex-wrap">
      <div className="flex items-center gap-2">
        <Checkbox
          id={checkboxId}
          checked={alwaysAllow}
          onCheckedChange={(checked) => setAlwaysAllow(checked === true)}
          data-testid="tool-confirmation-always-allow"
        />
        <Label htmlFor={checkboxId}>
          {t('chat.toolConfirmation.alwaysAllow')}
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            decide({ toolCallId, approved: false, alwaysAllow: false })
          }
          data-testid="tool-confirmation-reject"
        >
          {t('chat.toolConfirmation.reject')}
        </Button>
        <Button
          size="sm"
          onClick={() => decide({ toolCallId, approved: true, alwaysAllow })}
          data-testid="tool-confirmation-confirm"
        >
          {t('chat.toolConfirmation.confirm')}
        </Button>
      </div>
    </ItemFooter>
  );
}
