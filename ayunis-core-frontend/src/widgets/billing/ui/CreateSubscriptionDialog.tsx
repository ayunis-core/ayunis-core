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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/shadcn/popover';
import { Calendar } from '@/shared/ui/shadcn/calendar';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/shared/ui/shadcn/scroll-area';
import { useState, type ReactNode } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { CalendarIcon, XIcon } from 'lucide-react';
import { cn } from '@/shared/lib/shadcn/utils';

export interface CreateSubscriptionFormData {
  companyName: string;
  subText?: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
  vatNumber?: string;
  type: 'SEAT_BASED' | 'USAGE_BASED';
  noOfSeats?: number;
  monthlyCredits?: number;
  startsAt?: string;
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
  const subscriptionType = form.watch('type');

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
              <BillingInfoFields form={form} t={t} />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('subscriptionDialog.typeLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={t(
                              'subscriptionDialog.typePlaceholder',
                            )}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SEAT_BASED">
                          {t('subscriptionDialog.typeSeatBased')}
                        </SelectItem>
                        <SelectItem value="USAGE_BASED">
                          {t('subscriptionDialog.typeUsageBased')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {subscriptionType === 'SEAT_BASED' && (
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
              )}
              {subscriptionType === 'USAGE_BASED' && (
                <FormField
                  control={form.control}
                  name="monthlyCredits"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('subscriptionDialog.monthlyCreditsLabel')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t(
                            'subscriptionDialog.monthlyCreditsPlaceholder',
                          )}
                          type="number"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      <FormDescription>
                        {t('subscriptionDialog.monthlyCreditsDescription')}
                      </FormDescription>
                    </FormItem>
                  )}
                />
              )}
              <StartDateField form={form} t={t} />
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

function BillingInfoFields({
  form,
  t,
}: Readonly<{
  form: UseFormReturn<CreateSubscriptionFormData>;
  t: (key: string) => string;
}>) {
  return (
    <>
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
    </>
  );
}

function StartDateField({
  form,
  t,
}: Readonly<{
  form: UseFormReturn<CreateSubscriptionFormData>;
  t: (key: string) => string;
}>) {
  const [open, setOpen] = useState(false);

  return (
    <FormField
      control={form.control}
      name="startsAt"
      render={({ field }) => {
        const selectedDate = field.value ? new Date(field.value) : undefined;
        return (
          <FormItem>
            <FormLabel>{t('subscriptionDialog.startsAtLabel')}</FormLabel>
            <div className="flex items-center gap-2">
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start font-normal',
                        !field.value && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate
                        ? selectedDate.toLocaleDateString()
                        : t('subscriptionDialog.startsAtPlaceholder')}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      field.onChange(date?.toISOString());
                      setOpen(false);
                    }}
                    disabled={(date) => date < new Date()}
                    captionLayout="dropdown"
                  />
                </PopoverContent>
              </Popover>
              {field.value && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => field.onChange(undefined)}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
            <FormDescription>
              {t('subscriptionDialog.startsAtDescription')}
            </FormDescription>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
