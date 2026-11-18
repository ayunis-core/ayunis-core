import { useTranslation } from 'react-i18next';
import { Download, ExternalLink } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import config from '@/shared/config';
import { CopyButton } from '@/shared/ui/copy-button';
import { outlookManifestUrl } from '@/pages/admin-settings/integrations-settings/lib/outlook-manifest-url';

// Microsoft's link to the Microsoft 365 admin center, from its deployment docs.
const M365_ADMIN_CENTER_URL =
  'https://go.microsoft.com/fwlink/p/?linkid=2024339';
const DEPLOY_STEPS = ['openAdminCenter', 'deployAddin', 'provideUrl', 'assign'];

/**
 * How an organisation installs the Outlook add-in. Microsoft's install flows
 * accept no manifest from a link, so this hands the admin the URL to paste.
 */
export function OutlookAddinSection() {
  const { t } = useTranslation('admin-settings-integrations');
  const manifestUrl = outlookManifestUrl(
    config.api.baseUrl,
    window.location.origin,
  );

  return (
    <Card data-testid="outlook-addin-section">
      <CardHeader>
        <CardTitle>{t('integrations.outlook.title')}</CardTitle>
        <CardDescription>
          {t('integrations.outlook.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {t('integrations.outlook.manifestUrl')}
          </p>
          <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-1.5">
            <code
              className="min-w-0 flex-1 truncate text-sm"
              data-testid="outlook-addin-manifest-url"
            >
              {manifestUrl}
            </code>
            <CopyButton
              value={manifestUrl}
              label={t('integrations.outlook.manifestUrl')}
              testId="outlook-addin-copy-manifest-url"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" asChild>
            <a
              href={M365_ADMIN_CENTER_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
              {t('integrations.outlook.openAdminCenter')}
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a
              href={manifestUrl}
              download="ayunis-outlook-manifest.xml"
              data-testid="outlook-addin-download-manifest"
            >
              <Download className="h-4 w-4" />
              {t('integrations.outlook.downloadManifest')}
            </a>
          </Button>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-medium">{t('integrations.outlook.steps.title')}</p>
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            {DEPLOY_STEPS.map((step) => (
              <li key={step}>{t(`integrations.outlook.steps.${step}`)}</li>
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
