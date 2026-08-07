import { useTranslation } from 'react-i18next';
import { AlertCircle, Loader2 } from 'lucide-react';
import SuperAdminSettingsLayout from '../../super-admin-settings-layout';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Alert, AlertDescription } from '@/shared/ui/shadcn/alert';
import { PII_CATEGORIES } from '@/shared/lib/pii-categories';
import { useGlobalWhitelistWords } from '../api/useGlobalWhitelistWords';
import { CategoryWordSection } from './CategoryWordSection';

export default function AnonymizationWhitelistPage() {
  const { t } = useTranslation('super-admin-settings-anonymization');
  const { wordsByCategory, isLoading, isError, refetch } =
    useGlobalWhitelistWords();

  if (isLoading) {
    return (
      <SuperAdminSettingsLayout pageTitle={t('title')}>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </SuperAdminSettingsLayout>
    );
  }

  if (isError) {
    return (
      <SuperAdminSettingsLayout pageTitle={t('title')}>
        <Card>
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('loadError')}
                <Button variant="link" onClick={() => void refetch()}>
                  {t('retry')}
                </Button>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </SuperAdminSettingsLayout>
    );
  }

  return (
    <SuperAdminSettingsLayout pageTitle={t('title')}>
      <Card>
        <CardHeader>
          <CardTitle>{t('heading')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {PII_CATEGORIES.map((category) => (
            <CategoryWordSection
              key={category}
              category={category}
              words={wordsByCategory[category] ?? []}
            />
          ))}
        </CardContent>
      </Card>
    </SuperAdminSettingsLayout>
  );
}
