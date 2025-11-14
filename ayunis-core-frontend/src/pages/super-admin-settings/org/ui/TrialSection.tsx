import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { useTranslation } from 'react-i18next';
import type { SuperAdminTrialResponseDto } from '@/shared/api';
import { format } from 'date-fns';

interface TrialSectionProps {
  trial: SuperAdminTrialResponseDto;
}

export default function TrialSection({ trial }: TrialSectionProps) {
  const { t } = useTranslation('super-admin-settings-org');

  const remainingMessages = trial.maxMessages - trial.messagesSent;
  const usagePercentage = (trial.messagesSent / trial.maxMessages) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('trial.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {t('trial.messagesSent')}
            </p>
            <p className="text-2xl font-bold">{trial.messagesSent}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {t('trial.maxMessages')}
            </p>
            <p className="text-2xl font-bold">{trial.maxMessages}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {t('trial.remainingMessages')}
            </p>
            <p className="text-2xl font-bold">{remainingMessages}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {t('trial.usagePercentage')}
            </p>
            <p className="text-2xl font-bold">{usagePercentage.toFixed(1)}%</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t('trial.usageProgress')}
            </span>
            <span className="font-medium">
              {trial.messagesSent} / {trial.maxMessages}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {t('trial.createdAt')}
            </p>
            <p className="text-sm">
              {format(new Date(trial.createdAt), 'PPpp')}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {t('trial.updatedAt')}
            </p>
            <p className="text-sm">
              {format(new Date(trial.updatedAt), 'PPpp')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
