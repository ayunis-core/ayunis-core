import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Button } from '@/shared/ui/shadcn/button';
import { Badge } from '@/shared/ui/shadcn/badge';
import { useTranslation } from 'react-i18next';
import type { SubscriptionResponseDto } from '@/shared/api';
import LicenseSeatsUpdateDialog from './LicenseSeatsUpdateDialog';

interface LicenseSeatsSectionProps {
  subscription: SubscriptionResponseDto;
  orgId: string;
}

export default function LicenseSeatsSection({
  subscription,
  orgId,
}: Readonly<LicenseSeatsSectionProps>) {
  const { t } = useTranslation('super-admin-settings-org');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t('licenseSeats.title')}
        </CardTitle>
        <CardAction>
          <LicenseSeatsUpdateDialog
            subscription={subscription}
            orgId={orgId}
            trigger={
              <Button size="sm" variant="outline">
                {t('licenseSeats.manage')}
              </Button>
            }
          />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {t('licenseSeats.usedSeats')}
              </span>
            </div>
            <Badge variant="outline">
              {subscription.noOfSeats - subscription.availableSeats}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {t('licenseSeats.availableSeats')}
              </span>
            </div>
            <Badge variant="outline">{subscription.availableSeats}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
