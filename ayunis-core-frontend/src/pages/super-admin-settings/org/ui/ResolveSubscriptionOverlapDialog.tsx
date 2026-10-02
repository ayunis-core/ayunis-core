import { useEffect, useMemo, useRef, useState } from 'react';
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
import { Input } from '@ayunis/ui/components/input';
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
import { toLocalDateTime } from '@/pages/super-admin-settings/org/lib/subscription-history';

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
      accessEndsAtBySubscriptionId: {},
      reason: '',
    },
  });
  const lastPrefilledAuthoritativeId = useRef('');
  const authoritativeId = useWatch({
    control: form.control,
    name: 'authoritativeSubscriptionId',
  });
  const conflicting = serving.filter(({ id }) => id !== authoritativeId);
  const resetDialog = () => {
    form.reset();
    lastPrefilledAuthoritativeId.current = '';
  };
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) resetDialog();
  };
  const { resolveOverlap, isResolving } = useResolveSubscriptionOverlap({
    orgId,
    form,
    onSuccess: () => handleOpenChange(false),
  });

  useEffect(() => {
    const authoritative = serving.find(({ id }) => id === authoritativeId);
    if (
      !authoritative ||
      authoritative.id === lastPrefilledAuthoritativeId.current
    ) {
      return;
    }
    serving
      .filter(({ id }) => id !== authoritative.id)
      .forEach((subscription) => {
        const boundary = new Date(
          Math.max(
            new Date(authoritative.startsAt).getTime(),
            new Date(subscription.startsAt).getTime(),
          ),
        );
        form.setValue(
          `accessEndsAtBySubscriptionId.${subscription.id}`,
          toLocalDateTime(boundary),
          { shouldValidate: true },
        );
      });
    lastPrefilledAuthoritativeId.current = authoritative.id;
  }, [authoritativeId, form, serving]);

  const onSubmit = (values: ResolveSubscriptionOverlapFormData) => {
    resolveOverlap({
      authoritativeSubscriptionId: values.authoritativeSubscriptionId,
      adjustments: conflicting.map(({ id }) => ({
        subscriptionId: id,
        accessEndsAt: new Date(
          values.accessEndsAtBySubscriptionId[id],
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
      <DialogContent className="sm:max-w-[600px]">
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
            {authoritativeId &&
              conflicting.map((subscription) => (
                <FormField
                  key={subscription.id}
                  control={form.control}
                  name={`accessEndsAtBySubscriptionId.${subscription.id}`}
                  rules={{
                    required: t('subscriptionOverlap.validation.required'),
                    validate: (value) =>
                      new Date(value) <= new Date() ||
                      t('subscriptionOverlap.validation.notFuture'),
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('subscriptionOverlap.accessEnd', {
                          subscription: subscriptionLabel(subscription, t),
                        })}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          step={0.001}
                          max={toLocalDateTime(new Date())}
                          data-testid={`subscription-access-end-${subscription.id}`}
                          disabled={isResolving}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
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
