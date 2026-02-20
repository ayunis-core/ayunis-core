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
import { useWatch } from 'react-hook-form';
import useSubscriptionCreate from '../api/useSubscriptionCreate';
import { ScrollArea } from '@/shared/ui/shadcn/scroll-area';
import type { PriceResponseDto } from '@/shared/api';

interface CreateSubscriptionDialogProps {
  trigger: React.ReactNode;
  subscriptionPrice: PriceResponseDto;
}

export default function CreateSubscriptionDialog({
  trigger,
  subscriptionPrice,
}: Readonly<CreateSubscriptionDialogProps>) {
  const { t } = useTranslation('admin-settings-billing');
  const { form, handleSubmit } = useSubscriptionCreate();

  // Watch the noOfSeats field for changes
  const noOfSeats = useWatch({
    control: form.control,
    name: 'noOfSeats',
  });

  const handleCancel = () => {
    form.reset();
  };

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
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
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
              <div className="text-center py-4 border-b">
                <p className="text-sm text-muted-foreground text-center">
                  {t('subscriptionDialog.totalPrice', {
                    price:
                      subscriptionPrice.pricePerSeatMonthly * (noOfSeats || 1),
                  })}
                </p>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {t('subscriptionDialog.paymentMethodHint')}
              </p>
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
                  {t('subscriptionDialog.createSubscription')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
