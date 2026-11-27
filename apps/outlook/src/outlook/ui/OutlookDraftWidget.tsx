import type { ToolCardProps } from '@ayunis/chat/tool-cards';
import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemMedia,
} from '@ayunis/ui/components/item';
import { cn } from '@ayunis/ui/lib/cn';
import { PiiText } from '@ayunis/chat/markdown';
import type {
  OutlookToolCall,
  OutlookToolName,
} from '@/features/outlook-tools';
import type { ToolUseMessageContentResponseDto as ToolUseMessageContent } from '@ayunis/api-client/schemas';
import {
  useOutlookToolBridgeContext,
  type OutlookToolBridge,
  type OutlookToolState,
} from '@/outlook/model/outlook-tool-bridge';

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

function draftCall(content: ToolUseMessageContent): OutlookToolCall {
  return {
    id: content.id,
    name: content.name as OutlookToolName,
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- params may be undefined while the call streams
    params: content.params ?? {},
  };
}

function DraftBody({
  body,
  status,
  isStreaming,
}: Readonly<{ body: string; status: string | null; isStreaming: boolean }>) {
  const { t } = useTranslation('chat');
  return (
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
  );
}

interface DraftActionProps {
  readonly bridge: OutlookToolBridge;
  readonly call: OutlookToolCall;
  readonly running: boolean;
}

function DraftReplyActions({ bridge, call, running }: DraftActionProps) {
  const { t } = useTranslation('chat');
  return (
    <ItemFooter>
      <ItemActions>
        <Button
          size="sm"
          disabled={running}
          onClick={() => bridge.openReply(call, 'all')}
          data-testid="outlook-draft-reply-all"
        >
          {t('chat.outlookDraft.replyAll')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={running}
          onClick={() => bridge.openReply(call, 'sender')}
          data-testid="outlook-draft-reply"
        >
          {t('chat.outlookDraft.reply')}
        </Button>
      </ItemActions>
    </ItemFooter>
  );
}

function DraftInsertAction({
  bridge,
  call,
  running,
  isStreaming,
}: DraftActionProps & { readonly isStreaming: boolean }) {
  const { t } = useTranslation('chat');
  return (
    <ItemFooter>
      <Button
        size="sm"
        disabled={isStreaming || running}
        onClick={() => bridge.insertDraft(call)}
        data-testid="outlook-draft-insert"
      >
        {t('chat.outlookDraft.insert')}
      </Button>
    </ItemFooter>
  );
}

function DraftActions({
  bridge,
  call,
  state,
  isStreaming,
}: Readonly<{
  bridge: OutlookToolBridge;
  call: OutlookToolCall;
  state: OutlookToolState | undefined;
  isStreaming: boolean;
}>) {
  const action = bridge.draftAction(call);
  const running = state?.status === 'running';
  if (action === 'reply' && !isStreaming) {
    return <DraftReplyActions bridge={bridge} call={call} running={running} />;
  }
  if (action === 'insert' && state?.status !== 'done') {
    return (
      <DraftInsertAction
        bridge={bridge}
        call={call}
        running={running}
        isStreaming={isStreaming}
      />
    );
  }
  return null;
}

export default function OutlookDraftWidget({
  content,
  isStreaming = false,
}: Readonly<{ content: ToolUseMessageContent; isStreaming?: boolean }>) {
  const bridge = useOutlookToolBridgeContext();
  const call = draftCall(content);
  const body = typeof call.params.body === 'string' ? call.params.body : '';
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
      <DraftBody body={body} status={status} isStreaming={isStreaming} />
      {bridge && (
        <DraftActions
          bridge={bridge}
          call={call}
          state={state}
          isStreaming={isStreaming}
        />
      )}
    </Item>
  );
}

export function OutlookDraftCard({ toolUse, isStreaming }: ToolCardProps) {
  return <OutlookDraftWidget content={toolUse} isStreaming={isStreaming} />;
}
