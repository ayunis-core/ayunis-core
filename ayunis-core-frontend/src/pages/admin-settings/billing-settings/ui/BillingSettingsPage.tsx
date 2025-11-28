import SettingsLayout from '../../admin-settings-layout';
import LicenseSeatsSection from './LicenseSeatsSection';
import BillingInfoSection from './BillingInfoSection';
import SubscriptionCancellationSection from './SubscriptionCancellationSection';
import SubscriptionGetStartedSection from './SubscriptionGetStartedSection';
import type { PriceResponseDto, SubscriptionResponseDto } from '@/shared/api';

interface BillingSettingsPageProps {
  subscription?: SubscriptionResponseDto | null;
  subscriptionPrice: PriceResponseDto;
}

export default function BillingSettingsPage({
  subscription = null,
  subscriptionPrice,
}: BillingSettingsPageProps) {
  const pageContentNoSubscription = (
    <SubscriptionGetStartedSection subscriptionPrice={subscriptionPrice} />
  );

  const pageContentSubscription = (
    <div className="space-y-4">
      <LicenseSeatsSection subscription={subscription!} />
      <BillingInfoSection subscription={subscription!} />
      <SubscriptionCancellationSection subscription={subscription!} />
    </div>
  );

  return (
    <SettingsLayout>
      {subscription ? pageContentSubscription : pageContentNoSubscription}
    </SettingsLayout>
  );
}
