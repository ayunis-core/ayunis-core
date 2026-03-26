import type { ReactNode } from 'react';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Button } from '@/shared/ui/shadcn/button';
import { Badge } from '@/shared/ui/shadcn/badge';
import type { TFunction } from 'i18next';
import type { SubscriptionResponseDto } from '@/shared/api';
import { useConfirmation } from '@/widgets/confirmation-modal';

export interface SubscriptionCancellationActions {
  readonly cancelSubscription: () => void;
  readonly uncancelSubscription: () => void;
}

interface SubscriptionCancellationSectionProps {
  readonly subscription: SubscriptionResponseDto;
  readonly actions: SubscriptionCancellationActions;
  readonly t: TFunction;
  readonly renderStatusBadge?: (
    subscription: SubscriptionResponseDto,
  ) => ReactNode;
  readonly renderActiveActions?: (cancelButton: ReactNode) => ReactNode;
  readonly activeContent?: ReactNode;
  readonly cancelledContent?: ReactNode;
}

function DefaultStatusBadge({
  isCancelled,
  t,
}: Readonly<{
  isCancelled: boolean;
  t: TFunction;
}>) {
  if (isCancelled) {
    return <Badge variant="destructive">{t('subscription.cancelled')}</Badge>;
  }

  return <Badge variant="secondary">{t('subscription.active')}</Badge>;
}

export default function SubscriptionCancellationSection({
  subscription,
  actions,
  t,
  renderStatusBadge,
  renderActiveActions,
  activeContent,
  cancelledContent,
}: Readonly<SubscriptionCancellationSectionProps>) {
  const { cancelSubscription, uncancelSubscription } = actions;
  const { confirm: confirmUncancel } = useConfirmation();
  const { confirm: confirmCancel } = useConfirmation();

  // eslint-disable-next-line eqeqeq -- intentional loose equality to catch both null and undefined from the API
  const isCancelled = subscription.cancelledAt != null;
  const statusBadge = renderStatusBadge?.(subscription) ?? (
    <DefaultStatusBadge isCancelled={isCancelled} t={t} />
  );
  const cancelButton = (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        confirmCancel({
          title: t('subscription.cancelSubscription'),
          description: t('subscription.cancelSubscriptionDescription'),
          confirmText: t('subscription.confirmCancel'),
          cancelText: t('subscription.cancelCancel'),
          variant: 'destructive',
          onConfirm: () => {
            cancelSubscription();
          },
        });
      }}
    >
      {t('subscription.cancel')}
    </Button>
  );

  if (isCancelled) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t('subscription.title')}
            {statusBadge}
          </CardTitle>
          <CardAction>
            <Button
              size="sm"
              variant="default"
              onClick={() => {
                confirmUncancel({
                  title: t('subscription.reactivateSubscription'),
                  description: t(
                    'subscription.reactivateSubscriptionDescription',
                  ),
                  confirmText: t('subscription.confirmReactivate'),
                  cancelText: t('subscription.cancelCancel'),
                  variant: 'default',
                  onConfirm: () => {
                    uncancelSubscription();
                  },
                });
              }}
            >
              {t('subscription.reactivate')}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {cancelledContent ?? (
            <p className="text-sm text-muted-foreground">
              {t('subscription.reactivateAnytime')}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t('subscription.title')}
          {statusBadge}
        </CardTitle>
        <CardAction>
          {renderActiveActions?.(cancelButton) ?? cancelButton}
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeContent ?? (
          <p className="text-sm text-muted-foreground">
            {t('subscription.nextRenewalDate', {
              date: new Date(subscription.nextRenewalDate).toLocaleDateString(),
            })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
