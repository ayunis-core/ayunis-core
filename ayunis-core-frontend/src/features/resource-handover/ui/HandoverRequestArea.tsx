import { Clock } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { useWithdrawHandover } from '@/features/resource-handover/api/useHandoverActions';
import {
  reviewerCopy,
  targetCopy,
} from '@/features/resource-handover/lib/handover-copy';
import { useHandoverCopy } from '@/features/resource-handover/model/useHandoverCopy';
import type {
  HandoverKind,
  PendingHandover,
} from '@/features/resource-handover/model/types';
import { HandoverDecisionButtons } from './HandoverDecisionButtons';

function RequestStatus({
  kind,
  pending,
}: Readonly<{ kind: HandoverKind; pending: PendingHandover }>) {
  const { t, text, date } = useHandoverCopy(kind);
  const withdraw = useWithdrawHandover(kind, pending.resource.id);

  return (
    <div
      className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-sm text-muted-foreground"
      data-testid="handover-status"
    >
      <Clock className="size-4 shrink-0" />
      <span>
        {t('status.text', {
          target: text(targetCopy('to', pending.target)),
          date: date(pending.requestedAt),
          reviewer: text(reviewerCopy(pending.target, pending.reviewers)),
        })}
      </span>
      <Button
        variant="link"
        size="sm"
        className="h-auto p-0"
        disabled={withdraw.isPending}
        onClick={() => withdraw.mutate(pending.id)}
        data-testid="handover-withdraw"
      >
        {t('status.withdraw')}
      </Button>
    </div>
  );
}

function ReviewBanner({
  kind,
  pending,
  onDecided,
}: Readonly<{
  kind: HandoverKind;
  pending: PendingHandover;
  onDecided?: () => Promise<void> | void;
}>) {
  const { t, text, date } = useHandoverCopy(kind);
  const name = pending.requestedBy.name;

  return (
    <Item variant="outline" data-testid="handover-review-banner">
      <ItemContent>
        <ItemTitle>
          {text(
            { key: 'review.title' },
            { name, target: text(targetCopy('to', pending.target)) },
          )}
        </ItemTitle>
        <ItemDescription>
          {t('review.text', {
            name,
            date: date(pending.requestedAt),
            owner: text(targetCopy('owner', pending.target)),
          })}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <HandoverDecisionButtons
          kind={kind}
          request={pending}
          onDecided={onDecided}
        />
      </ItemActions>
    </Item>
  );
}

export function HandoverRequestArea({
  kind,
  pending,
  onDecided,
}: Readonly<{
  kind: HandoverKind;
  pending: PendingHandover | null;
  onDecided?: () => Promise<void> | void;
}>) {
  if (!pending) return null;
  if (pending.viewerIsRequester) {
    return <RequestStatus kind={kind} pending={pending} />;
  }
  return pending.viewerCanReview ? (
    <ReviewBanner kind={kind} pending={pending} onDecided={onDecided} />
  ) : null;
}
