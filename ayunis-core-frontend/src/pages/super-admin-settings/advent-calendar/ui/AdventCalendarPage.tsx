import { useTranslation } from 'react-i18next';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@ayunis/ui/components/alert';
import SuperAdminSettingsLayout from '@/pages/super-admin-settings/super-admin-settings-layout';
import { useAdventCalendarManagement } from '@/pages/super-admin-settings/advent-calendar/api/useAdventCalendarManagement';
import AdventCalendarEnabledCard from './AdventCalendarEnabledCard';
import AdventCalendarDoorsCard from './AdventCalendarDoorsCard';

export default function AdventCalendarPage() {
  const { t } = useTranslation('super-admin-settings-advent-calendar');
  const { calendar, isLoading, isError } = useAdventCalendarManagement();

  return (
    <SuperAdminSettingsLayout pageTitle={t('title')}>
      <div className="space-y-6">
        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{t('loadError')}</AlertDescription>
          </Alert>
        )}
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {calendar && (
          <>
            <AdventCalendarEnabledCard enabled={calendar.enabled} />
            <AdventCalendarDoorsCard doors={calendar.doors} />
          </>
        )}
      </div>
    </SuperAdminSettingsLayout>
  );
}
