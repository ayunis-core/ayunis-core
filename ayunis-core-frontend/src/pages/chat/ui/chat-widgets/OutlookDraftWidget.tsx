import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemMedia,
} from '@ayunis/ui/components/item';
import { cn } from '@ayunis/ui/lib/cn';
import { PiiText } from '@/widgets/markdown';
import type { OutlookToolName } from '@/features/outlook-tools';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import {
  useOutlookToolBridgeContext,
  type OutlookToolState,
} from '@/pages/chat/model/outlook-tool-bridge';

function statusKey(state: OutlookToolState | undefined): string | null {
  switch (state?.status) {
    case undefined:
    case 'result':
      return null;
    case 'running':
      return 'running';
    case 'done':
      return state.action;
    case 'failed':
      return `failed.${state.failure}`;
  }
}

/**
 * A reply draft the model wrote for Outlook. In the Outlook pane's read view
 * the user opens a reply with it; elsewhere it is only shown.
 */
export default function OutlookDraftWidget({
  content,
  isStreaming = false,
}: Readonly<{ content: ToolUseMessageContent; isStreaming?: boolean }>) {
  const { t } = useTranslation('chat');
  const bridge = useOutlookToolBridgeContext();
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- params may be undefined while the call streams
  const params = (content.params ?? {}) as Record<string, unknown>;
  const body = typeof params.body === 'string' ? params.body : '';
  const state = bridge?.stateFor(content.id);
  const status = statusKey(state);

  return (
    <Item
      variant="outline"
      className="my-2 w-full"
      data-testid="outlook-draft"
      data-tool-call-id={content.id}
      data-status={status ?? 'none'}
    >
      <ItemMedia variant="icon">
        <Mail />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <p
          className={cn(
            'whitespace-pre-wrap break-words text-sm',
            isStreaming && 'animate-pulse',
          )}
        >
          <PiiText>{body}</PiiText>
        </p>
        {status && (
          <ItemDescription>
            {t(`chat.outlookDraft.status.${status}`)}
          </ItemDescription>
        )}
      </ItemContent>
      {bridge?.canOpenReply({
        id: content.id,
        name: content.name as OutlookToolName,
      }) && (
        <ItemFooter>
          <Button
            size="sm"
            disabled={isStreaming || state?.status === 'running'}
            onClick={() =>
              bridge.openReply({
                id: content.id,
                name: content.name as OutlookToolName,
                params,
              })
            }
            data-testid="outlook-draft-insert"
          >
            {t('chat.outlookDraft.insert')}
          </Button>
        </ItemFooter>
      )}
    </Item>
  );
}
