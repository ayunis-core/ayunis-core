import { Button } from '@ayunis/ui/components/button';
import { ScrollArea } from '@ayunis/ui/components/scroll-area';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import type {
  Suggestion,
  SuggestionDetail,
} from '@/pages/suggestion-prototype/model/scenarios';
import {
  KIND_APPEARANCE,
  type KindAppearance,
} from '@/pages/suggestion-prototype/ui/kind-appearance';
import {
  DismissedNotice,
  ResultCard,
  type SuggestionStatus,
} from '@/pages/suggestion-prototype/ui/ResultCard';
import { TechnicalDetails } from '@/pages/suggestion-prototype/ui/TechnicalDetails';

interface SuggestionCardProps {
  suggestion: Suggestion;
  status: SuggestionStatus;
  onAccept: () => void;
  onSecondary?: () => void;
  onDismiss: () => void;
  onUndoDismiss: () => void;
  resultNote?: string;
}

export function SuggestionCard({
  suggestion,
  status,
  onUndoDismiss,
  resultNote,
  ...handlers
}: Readonly<SuggestionCardProps>) {
  const appearance = KIND_APPEARANCE[suggestion.kind];

  if (status === 'dismissed') {
    return (
      <DismissedNotice
        label={appearance.dismissed}
        onUndo={appearance.canUndoDismiss ? onUndoDismiss : undefined}
      />
    );
  }
  if (status === 'accepted') {
    return (
      <ResultCard
        kind={suggestion.kind}
        title={suggestion.subject}
        note={resultNote}
      />
    );
  }

  return (
    <Item
      variant="outline"
      className="my-2 w-full"
      data-testid="suggestion-next-step"
    >
      <ItemContent className="gap-2">
        <ItemDescription className="line-clamp-none text-pretty">
          {suggestion.reason}
        </ItemDescription>
        <ItemTitle className="leading-normal">{suggestion.ask}</ItemTitle>
      </ItemContent>
      <div className="flex basis-full flex-col gap-3">
        <SummaryBlock
          summary={suggestion.summary}
          technical={suggestion.technical}
        />
        <DecisionButtons
          appearance={appearance}
          isPending={status === 'pending'}
          {...handlers}
        />
      </div>
    </Item>
  );
}

function DecisionButtons({
  appearance,
  isPending,
  onAccept,
  onSecondary,
  onDismiss,
}: Readonly<{
  appearance: KindAppearance;
  isPending: boolean;
  onAccept: () => void;
  onSecondary?: () => void;
  onDismiss: () => void;
}>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" onClick={onAccept} disabled={isPending}>
        {isPending ? appearance.pending : appearance.action}
      </Button>
      {onSecondary && appearance.secondary && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onSecondary}
          disabled={isPending}
        >
          {appearance.secondary}
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={onDismiss}
        disabled={isPending}
      >
        Ablehnen
      </Button>
    </div>
  );
}

export function SummaryBlock({
  summary,
  technical,
}: Readonly<{ summary: SuggestionDetail[]; technical?: string }>) {
  return (
    <Item variant="muted" size="sm">
      <ItemContent className="gap-2">
        <dl className="grid grid-cols-[10rem_1fr] gap-x-4 gap-y-2">
          {summary.map((detail) => (
            <div key={detail.label} className="contents">
              <dt className="text-muted-foreground">{detail.label}</dt>
              <dd className="min-w-0">
                <ScrollArea className="[&>[data-slot=scroll-area-viewport]]:max-h-40">
                  <p className="pr-3 whitespace-pre-line">{detail.value}</p>
                </ScrollArea>
              </dd>
            </div>
          ))}
        </dl>
        {technical && <TechnicalDetails text={technical} />}
      </ItemContent>
    </Item>
  );
}
