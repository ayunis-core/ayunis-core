import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/shadcn/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/shadcn/form';
import { Input } from '@/shared/ui/shadcn/input';
import { Button } from '@/shared/ui/shadcn/button';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/shared/ui/shadcn/scroll-area';
import type { ReactNode } from 'react';
import type { UseFormReturn } from 'react-hook-form';

interface CreateSubscriptionFormData {
  companyName: string;
  subText?: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
  vatNumber?: string;
  noOfSeats: number;
}

interface CreateSubscriptionDialogProps {
  trigger: ReactNode;
  translationNamespace: string;
  form: UseFormReturn<CreateSubscriptionFormData>;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  priceSection?: ReactNode;
  submittingLabel?: string;
}

export default function CreateSubscriptionDialog({
  trigger,
  translationNamespace,
  form,
  onSubmit,
  priceSection,
  submittingLabel,
}: Readonly<CreateSubscriptionDialogProps>) {
  const { t } = useTranslation(translationNamespace);

  const handleCancel = () => {
    form.reset();
  };

  const defaultLabel = t('subscriptionDialog.createSubscription');

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('subscriptionDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('subscriptionDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[500px]">
          <Form {...form}>
            <form
              onSubmit={(e) => {
                void onSubmit(e);
              }}
              className="space-y-6"
            >
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('billingInfo.companyNameLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('billingInfo.companyNamePlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('billingInfo.subTextLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('billingInfo.subTextPlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>{t('billingInfo.streetLabel')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('billingInfo.streetPlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="houseNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('billingInfo.houseNumberLabel')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('billingInfo.houseNumberPlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('billingInfo.postalCodeLabel')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('billingInfo.postalCodePlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>{t('billingInfo.cityLabel')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('billingInfo.cityPlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('billingInfo.countryLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('billingInfo.countryPlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vatNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('billingInfo.vatNumberLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('billingInfo.vatNumberPlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="noOfSeats"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('billingInfo.noOfSeatsLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('billingInfo.noOfSeatsPlaceholder')}
                        type="number"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <FormDescription>
                      {t('subscriptionDialog.noOfSeatsDescription')}
                    </FormDescription>
                  </FormItem>
                )}
              />
              {priceSection}
              <DialogFooter>
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={form.formState.isSubmitting}
                  >
                    {t('billingInfo.cancel')}
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting
                    ? (submittingLabel ?? defaultLabel)
                    : defaultLabel}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
