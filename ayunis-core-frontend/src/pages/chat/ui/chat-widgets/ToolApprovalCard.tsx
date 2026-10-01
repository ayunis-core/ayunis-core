import { useTranslation } from 'react-i18next';
import { ShieldQuestion } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { formatToolName } from '@/pages/chat/lib/format-tool-name';
import { useDecideToolApproval } from '@/pages/chat/api/useDecideToolApproval';
import type { ToolTimelineStep } from '@/pages/chat/ui/agent-run-timeline/model/types';

const MAX_PREVIEW_CHARS = 600;

function previewParams(params: Record<string, unknown>): string {
  const json = JSON.stringify(params, null, 2);
  return json.length > MAX_PREVIEW_CHARS
    ? `${json.slice(0, MAX_PREVIEW_CHARS)}…`
    : json;
}

export default function ToolApprovalCard({
  step,
  threadId,
}: Readonly<{ step: ToolTimelineStep; threadId: string }>) {
  const { t } = useTranslation('chat');
  const decide = useDecideToolApproval();
  const { toolUse } = step;
  const params = (toolUse.params as Record<string, unknown> | undefined) ?? {};
  const tool = formatToolName(toolUse.name);
  const integration = toolUse.integration?.name ?? '';
  // Stays disabled after a decision: the run resumes on its own and the card
  // disappears once the tool result arrives.
  const settled = decide.isPending || decide.isSuccess;

  return (
    <Item
      variant="outline"
      className="w-full"
      data-testid="tool-approval-card"
      data-tool-call-id={toolUse.id}
    >
      <ItemMedia variant="icon">
        {toolUse.integration?.logoUrl ? (
          <img
            src={toolUse.integration.logoUrl}
            alt={integration}
            className="h-4 w-4 object-contain"
          />
        ) : (
          <ShieldQuestion />
        )}
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          {t('chat.timeline.approval.title', { integration, tool })}
        </ItemTitle>
        <ItemDescription>
          {t('chat.timeline.approval.description')}
        </ItemDescription>
        {Object.keys(params).length > 0 && (
          <pre className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap break-words font-mono text-xs text-muted-foreground">
            {previewParams(params)}
          </pre>
        )}
      </ItemContent>
      <ItemActions>
        <Button
          variant="outline"
          size="sm"
          disabled={settled}
          data-testid="tool-approval-decline"
          onClick={() =>
            decide.mutate({
              threadId,
              toolCallId: toolUse.id,
              decision: 'declined',
            })
          }
        >
          {t('chat.timeline.approval.decline')}
        </Button>
        <Button
          size="sm"
          disabled={settled}
          data-testid="tool-approval-approve"
          onClick={() =>
            decide.mutate({
              threadId,
              toolCallId: toolUse.id,
              decision: 'approved',
            })
          }
        >
          {t('chat.timeline.approval.approve')}
        </Button>
      </ItemActions>
    </Item>
  );
}
