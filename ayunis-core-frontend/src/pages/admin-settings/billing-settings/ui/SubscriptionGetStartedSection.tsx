import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Button } from '@/shared/ui/shadcn/button';
import { ArrowRight, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CreateSubscriptionDialog from './CreateSubscriptionDialog';
import type { PriceResponseDto } from '@/shared/api';

interface SubscriptionGetStartedSectionProps {
  subscriptionPrice: PriceResponseDto;
}

export default function SubscriptionGetStartedSection({
  subscriptionPrice,
}: Readonly<SubscriptionGetStartedSectionProps>) {
  const { t } = useTranslation('admin-settings-billing');
  const features = [
    t('subscriptionGetStarted.features.unlimitedMessages'),
    t('subscriptionGetStarted.features.allModels'),
    t('subscriptionGetStarted.features.unlimitedAgents'),
    t('subscriptionGetStarted.features.promptLibrary'),
    t('subscriptionGetStarted.features.futureFeatures'),
  ];

  return (
    <Card className="mt-8 max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{t('subscriptionGetStarted.title')}</CardTitle>
        <CardDescription>
          {t('subscriptionGetStarted.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-4 border-b">
          <div className="text-3xl font-bold text-primary">
            {t('subscriptionGetStarted.pricing.amount', {
              price: subscriptionPrice.pricePerSeatMonthly,
            })}
          </div>
          <div className="text-sm text-muted-foreground">
            {t('subscriptionGetStarted.pricing.period')}
          </div>
          <div className="text-xs text-muted-foreground">
            {t('subscriptionGetStarted.pricing.billing')}
          </div>
        </div>
        <div className="space-y-2">
          {features.map((feature) => (
            <div key={feature} className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              {feature}
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="">
        <CreateSubscriptionDialog
          subscriptionPrice={subscriptionPrice}
          trigger={
            <Button className="w-full">
              {t('subscriptionGetStarted.getStartedNow')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          }
        />
      </CardFooter>
    </Card>
  );
}
