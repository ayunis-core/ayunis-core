import { useMemo, useState } from 'react';
import type { TFunction } from 'i18next';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@ayunis/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@ayunis/ui/components/dialog';
import { Textarea } from '@ayunis/ui/components/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import { useTranslation } from 'react-i18next';
import type {
  ResolveSubscriptionOverlapFormData,
  SubscriptionHistoryItem,
} from '@/pages/super-admin-settings/org/model/types';
import { useResolveSubscriptionOverlap } from '@/pages/super-admin-settings/org/api/useResolveSubscriptionOverlap';

interface ResolveSubscriptionOverlapDialogProps {
  orgId: string;
  subscriptions: SubscriptionHistoryItem[];
}

export default function ResolveSubscriptionOverlapDialog({
  orgId,
  subscriptions,
}: Readonly<ResolveSubscriptionOverlapDialogProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const [open, setOpen] = useState(false);
  const serving = useMemo(
    () =>
      subscriptions.filter(({ status }) =>
        ['ACTIVE', 'CANCELLED'].includes(status),
      ),
    [subscriptions],
  );
  const form = useForm<ResolveSubscriptionOverlapFormData>({
    defaultValues: {
      authoritativeSubscriptionId: '',
      reason: '',
    },
  });
  const authoritativeId = useWatch({
    control: form.control,
    name: 'authoritativeSubscriptionId',
  });
  const conflicting = serving.filter(({ id }) => id !== authoritativeId);
  const resetDialog = () => form.reset();
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) resetDialog();
  };
  const { resolveOverlap, isResolving } = useResolveSubscriptionOverlap({
    orgId,
    form,
    onSuccess: () => handleOpenChange(false),
  });

  const onSubmit = (values: ResolveSubscriptionOverlapFormData) => {
    const authoritative = serving.find(
      ({ id }) => id === values.authoritativeSubscriptionId,
    );
    if (!authoritative) {
      return;
    }

    resolveOverlap({
      authoritativeSubscriptionId: authoritative.id,
      adjustments: conflicting.map((subscription) => ({
        subscriptionId: subscription.id,
        accessEndsAt: new Date(
          Math.max(
            new Date(authoritative.startsAt).getTime(),
            new Date(subscription.startsAt).getTime(),
          ),
        ).toISOString(),
      })),
      reason: values.reason,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid="resolve-subscription-overlap-trigger"
        >
          {t('subscriptionOverlap.action')}
        </Button>
      </DialogTrigger>
      <DialogContent size="wide">
        <DialogHeader>
          <DialogTitle>{t('subscriptionOverlap.title')}</DialogTitle>
          <DialogDescription>
            {t('subscriptionOverlap.description')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
          >
            <FormField
              control={form.control}
              name="authoritativeSubscriptionId"
              rules={{ required: t('subscriptionOverlap.validation.required') }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('subscriptionOverlap.authoritative')}
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isResolving}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="subscription-authoritative-select">
                        <SelectValue
                          placeholder={t(
                            'subscriptionOverlap.authoritativePlaceholder',
                          )}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {serving.map((subscription) => (
                        <SelectItem
                          key={subscription.id}
                          value={subscription.id}
                          data-testid={`subscription-authoritative-${subscription.id}`}
                        >
                          {subscriptionLabel(subscription, t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {authoritativeId && (
              <p className="text-muted-foreground text-sm">
                {t('subscriptionOverlap.automaticAccessEnd')}
              </p>
            )}
            <FormField
              control={form.control}
              name="reason"
              rules={{
                required: t('subscriptionOverlap.validation.required'),
                maxLength: {
                  value: 500,
                  message: t('subscriptionOverlap.validation.maxLength'),
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('subscriptionOverlap.reason')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      data-testid="subscription-overlap-reason"
                      maxLength={500}
                      disabled={isResolving}
                      placeholder={t('subscriptionOverlap.reasonPlaceholder')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isResolving}
                onClick={() => handleOpenChange(false)}
              >
                {t('subscriptionOverlap.cancel')}
              </Button>
              <Button
                type="submit"
                data-testid="subscription-overlap-confirm"
                disabled={isResolving || !authoritativeId}
              >
                {isResolving
                  ? t('subscriptionOverlap.resolving')
                  : t('subscriptionOverlap.confirm')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function subscriptionLabel(
  subscription: SubscriptionHistoryItem,
  t: TFunction<'super-admin-settings-org'>,
): string {
  return t('subscriptionOverlap.subscriptionLabel', {
    type: t(`subscriptionHistory.types.${subscription.type}`),
    date: new Date(subscription.startsAt).toLocaleDateString(),
  });
}
