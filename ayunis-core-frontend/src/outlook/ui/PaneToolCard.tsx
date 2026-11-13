import { useTranslation } from 'react-i18next';
import { Check, CircleAlert, LoaderCircle, Mail } from 'lucide-react';
import type { OutlookToolCall } from '@/outlook/lib/pane-messages';
import type { PaneToolState } from '@/outlook/lib/use-pane-chat';

// A read tool's outcome is the text sent to the model; an `{ "error" }`
// object in it means Outlook could not deliver what the model asked for.
function readFailed(result: string): boolean {
  try {
    const parsed: unknown = JSON.parse(result);
    return typeof parsed === 'object' && parsed !== null && 'error' in parsed;
  } catch {
    return false;
  }
}

function statusKey(state: PaneToolState | undefined): string | null {
  if (!state) return null;
  switch (state.status) {
    case 'running':
      return 'running';
    case 'result':
      return readFailed(state.result) ? 'readFailed' : 'read';
    case 'done':
      return state.action;
    case 'failed':
      return `failed.${state.failure}`;
  }
}

function StatusIcon({ state }: Readonly<{ state?: PaneToolState }>) {
  if (state?.status === 'running') {
    return <LoaderCircle className="size-4 animate-spin" />;
  }
  if (
    state?.status === 'failed' ||
    (state?.status === 'result' && readFailed(state.result))
  ) {
    return <CircleAlert className="size-4 text-destructive" />;
  }
  if (state) return <Check className="size-4 text-primary" />;
  return <Mail className="size-4" />;
}

export function PaneToolCard({
  call,
  state,
}: Readonly<{ call: OutlookToolCall; state?: PaneToolState }>) {
  const { t } = useTranslation();
  const status = statusKey(state);
  return (
    <div
      className="flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm"
      data-testid="outlook-pane-tool-card"
      data-tool={call.name}
      data-status={status ?? 'none'}
    >
      <span className="mt-0.5 text-muted-foreground">
        <StatusIcon state={state} />
      </span>
      <div className="flex flex-col">
        <span className="font-medium">{t(`chat.tool.${call.name}`)}</span>
        {status && (
          <span className="text-muted-foreground">
            {t(`chat.toolStatus.${status}`)}
          </span>
        )}
      </div>
    </div>
  );
}
