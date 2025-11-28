import { Button } from '@/shared/ui/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/shared/ui/shadcn/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/shadcn/form';
import { Input } from '@/shared/ui/shadcn/input';
import { useTranslation } from 'react-i18next';
import useSuperAdminSubscriptionBillingInfoUpdate from '../api/useSuperAdminSubscriptionBillingInfoUpdate';
import type { UpdateBillingInfoDto } from '@/shared/api';
import { Loader2 } from 'lucide-react';

interface BillingManagementModalProps {
  currentBillingInfo: UpdateBillingInfoDto;
  orgId: string;
  trigger: React.ReactNode;
}

export default function BillingInfoUpdateDialog({
  trigger,
  currentBillingInfo,
  orgId,
}: BillingManagementModalProps) {
  const { t } = useTranslation('super-admin-settings-org');
  const { form, updateBillingInfo, isPending } =
    useSuperAdminSubscriptionBillingInfoUpdate({
      currentBillingInfo,
      orgId,
    });

  const handleCancel = () => {
    form.reset();
  };

  const handleSubmit = form.handleSubmit((data) => {
    updateBillingInfo(data);
  });

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('billingInfo.updateBillingInfo')}</DialogTitle>
          <DialogDescription>
            {t('billingInfo.updateBillingInfoDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
            className="space-y-4"
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={form.formState.isSubmitting}
              >
                {t('billingInfo.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || isPending}
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('billingInfo.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
