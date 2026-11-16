import { Fragment, useState } from 'react';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from '@ayunis/ui/components/item';
import type {
  MultiConfirmation,
  ToolCall,
} from '@/pages/suggestion-prototype/model/scenarios';
import { SummaryBlock } from '@/pages/suggestion-prototype/ui/SuggestionCard';

type CallDecision = 'allow' | 'always' | 'reject';
type Decisions = Partial<Record<string, CallDecision>>;

const RESULT_LABELS: Record<CallDecision, string> = {
  allow: 'Nur dieses Mal erlaubt',
  always: 'Immer erlaubt',
  reject: 'Abgelehnt',
};

export function MultiConfirmCard({
  reason,
  calls,
}: Readonly<MultiConfirmation>) {
  const [decisions, setDecisions] = useState<Decisions>({});
  const openCalls = calls.filter((call) => !decisions[call.id]);
  const decide = (id: string, decision: CallDecision) =>
    setDecisions((current) => ({ ...current, [id]: decision }));
  const decideRemaining = (decision: CallDecision) =>
    setDecisions((current) => ({
      ...Object.fromEntries(openCalls.map((call) => [call.id, decision])),
      ...current,
    }));

  return (
    <Item variant="outline" className="my-2 w-full" data-testid="multi-confirm">
      <ItemContent className="gap-2">
        <ItemDescription className="line-clamp-none text-pretty">
          {reason}
        </ItemDescription>
        {openCalls.length === 0 && (
          <ItemTitle className="leading-normal">
            {summary(calls, decisions)}
          </ItemTitle>
        )}
      </ItemContent>
      <ItemGroup className="basis-full">
        {calls.map((call, index) => (
          <Fragment key={call.id}>
            {index > 0 && <ItemSeparator />}
            <CallSection
              call={call}
              decision={decisions[call.id]}
              onDecide={(decision) => decide(call.id, decision)}
            />
          </Fragment>
        ))}
      </ItemGroup>
      {openCalls.length > 1 && (
        <div className="flex basis-full flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => decideRemaining('always')}
          >
            {openCalls.length === calls.length
              ? 'Alle immer erlauben'
              : `Übrige ${openCalls.length} immer erlauben`}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => decideRemaining('reject')}
          >
            {openCalls.length === calls.length
              ? 'Alle ablehnen'
              : `Übrige ${openCalls.length} ablehnen`}
          </Button>
        </div>
      )}
    </Item>
  );
}

function CallSection({
  call,
  decision,
  onDecide,
}: Readonly<{
  call: ToolCall;
  decision?: CallDecision;
  onDecide: (decision: CallDecision) => void;
}>) {
  return (
    <Item className="px-0 first:pt-0">
      <ItemContent>
        <ItemTitle>{call.tool}</ItemTitle>
      </ItemContent>
      {decision && (
        <ItemActions>
          <Badge variant={decision === 'reject' ? 'outline' : 'secondary'}>
            {RESULT_LABELS[decision]}
          </Badge>
        </ItemActions>
      )}
      {!decision && (
        <div className="flex basis-full flex-col gap-3">
          <SummaryBlock summary={call.summary} technical={call.toolName} />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => onDecide('always')}>
              Immer erlauben
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onDecide('allow')}
            >
              Nur dieses Mal
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDecide('reject')}
            >
              Ablehnen
            </Button>
          </div>
        </div>
      )}
    </Item>
  );
}

function summary(calls: ToolCall[], decisions: Decisions): string {
  const rejected = calls.filter(
    (call) => decisions[call.id] === 'reject',
  ).length;
  const confirmed = calls.length - rejected;
  if (confirmed === 0) {
    return 'Alle Aktionen abgelehnt. Ayunis Core hat nichts geändert.';
  }
  if (rejected === 0) return `${confirmed} Aktionen erlaubt.`;
  return `${confirmed} erlaubt, ${rejected} abgelehnt.`;
}
