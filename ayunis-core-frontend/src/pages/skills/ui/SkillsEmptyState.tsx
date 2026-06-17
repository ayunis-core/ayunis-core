import CreateSkillDialog from './CreateSkillDialog';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Store } from 'lucide-react';
import { EmptyState } from '@/widgets/empty-state';
import { Button } from '@/shared/ui/shadcn/button';
import { useMarketplaceConfig } from '@/features/marketplace';

export default function SkillsEmptyState() {
  const { t } = useTranslation('skills');
  const marketplace = useMarketplaceConfig();

  return (
    <EmptyState
      title={t('emptyState.title')}
      description={t('emptyState.description')}
      action={
        <div className="flex flex-col items-center gap-3">
          <CreateSkillDialog
            buttonText={t('createDialog.buttonTextFirst')}
            showIcon={true}
          />
          {marketplace.enabled && marketplace.url && (
            <Button variant="ghost" size="sm" className="text-brand" asChild>
              <a
                href={marketplace.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Store />
                {t('emptyState.browseMarketplace')}
                <ExternalLink />
              </a>
            </Button>
          )}
        </div>
      }
    />
  );
}
