import { Check, Lightbulb } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { DocumentWidgetCard } from '@/pages/chat/ui/chat-widgets/DocumentWidgetCard';
import type { SuggestionKind } from '@/pages/suggestion-prototype/model/scenarios';
import { KIND_APPEARANCE } from '@/pages/suggestion-prototype/ui/kind-appearance';

export type SuggestionStatus = 'open' | 'pending' | 'accepted' | 'dismissed';

export function ResultCard({
  kind,
  title,
  note,
}: Readonly<{ kind: SuggestionKind; title: string; note?: string }>) {
  const appearance = KIND_APPEARANCE[kind];

  return (
    <DocumentWidgetCard
      contentKey="suggestion-result"
      contentId={kind}
      title={title}
      statusLabel={
        <span className="flex items-center gap-1">
          <Check className="size-3" />
          {note ? `${appearance.result} · ${note}` : appearance.result}
        </span>
      }
      icon={appearance.icon}
      buttonLabel={appearance.open}
      artifactId="prototype"
      onOpen={() => undefined}
    />
  );
}

export function DismissedNotice({
  label,
  onUndo,
}: Readonly<{ label: string; onUndo?: () => void }>) {
  return (
    <div
      className="my-2 flex items-center gap-2 text-sm text-muted-foreground"
      data-testid="suggestion-card-dismissed"
    >
      <Lightbulb className="size-4 shrink-0" />
      <span>{label}</span>
      {onUndo && (
        <Button variant="ghost" size="xs" onClick={onUndo}>
          Rückgängig
        </Button>
      )}
    </div>
  );
}
