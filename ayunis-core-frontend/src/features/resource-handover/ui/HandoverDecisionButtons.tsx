import { Button } from '@ayunis/ui/components/button';
import { useDecideHandover } from '@/features/resource-handover/api/useHandoverActions';
import { useHandoverCopy } from '@/features/resource-handover/model/useHandoverCopy';
import type {
  HandoverKind,
  HandoverRequest,
} from '@/features/resource-handover/model/types';

export function HandoverDecisionButtons({
  kind,
  request,
  onDecided,
}: Readonly<{
  kind: HandoverKind;
  request: Pick<HandoverRequest, 'id' | 'resource' | 'target' | 'requestedBy'>;
  onDecided?: () => Promise<void> | void;
}>) {
  const { t } = useHandoverCopy(kind);
  const decide = useDecideHandover(kind, onDecided);

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        disabled={decide.isPending}
        onClick={() => decide.mutate({ request, decision: 'reject' })}
        data-testid={`handover-reject-${request.id}`}
      >
        {t('review.reject')}
      </Button>
      <Button
        size="sm"
        disabled={decide.isPending}
        onClick={() => decide.mutate({ request, decision: 'approve' })}
        data-testid={`handover-approve-${request.id}`}
      >
        {t('review.approve')}
      </Button>
    </>
  );
}
