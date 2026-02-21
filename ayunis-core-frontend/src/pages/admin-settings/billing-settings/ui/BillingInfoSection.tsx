import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Button } from '@/shared/ui/shadcn/button';
import { Building, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import BillingInfoUpdateDialog from './BillingInfoUpdateDialog';
import type { SubscriptionResponseDto } from '@/shared/api';

interface BillingInfoSectionProps {
  subscription: SubscriptionResponseDto;
}

export default function BillingInfoSection({
  subscription,
}: Readonly<BillingInfoSectionProps>) {
  const { t } = useTranslation('admin-settings-billing');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t('billingInfo.title')}
        </CardTitle>
        <CardAction>
          <BillingInfoUpdateDialog
            currentBillingInfo={subscription.billingInfo}
            trigger={
              <Button size="sm" variant="outline">
                {t('billingInfo.update')}
              </Button>
            }
          />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Building className="h-4 w-4 text-gray-500" />
            <div>
              <div className="text-sm font-medium">
                {t('billingInfo.companyName')}
              </div>
              <div className="text-sm text-gray-600">
                {subscription.billingInfo.companyName}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 text-gray-500" />
            <div>
              <div className="text-sm font-medium">
                {t('billingInfo.billingAddress')}
              </div>
              <div className="text-sm text-gray-600">
                {subscription.billingInfo.street}{' '}
                {subscription.billingInfo.houseNumber},{' '}
                {subscription.billingInfo.city}{' '}
                {subscription.billingInfo.postalCode},{' '}
                {subscription.billingInfo.country}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-4 w-4 text-gray-500 flex items-center justify-center text-xs font-semibold">
              VAT
            </div>
            <div>
              <div className="text-sm font-medium">
                {t('billingInfo.vatNumber')}
              </div>
              <div className="text-sm text-gray-600">
                {subscription.billingInfo.vatNumber ?? '-'}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
