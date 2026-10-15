import CreateSkillMenu from './CreateSkillMenu';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Store } from 'lucide-react';
import { EmptyState } from '@/widgets/empty-state';
import { Button } from '@ayunis/ui/components/button';
import { useSkillMarketplaceUrl } from '@/features/marketplace';
import { useMyPermissions } from '@/features/permissions';
import { useOwnerOptions } from '@/features/resource-ownership';

export default function SkillsEmptyState() {
  const { t } = useTranslation('skills');
  const marketplaceUrl = useSkillMarketplaceUrl();
  const { can, isLoading: isLoadingPermissions } = useMyPermissions();
  const { options, isLoading: isLoadingOwners } = useOwnerOptions('skill');
  const canCreate =
    isLoadingPermissions ||
    isLoadingOwners ||
    can('manage_own_skills') ||
    options.length > 0;

  return (
    <EmptyState
      title={t('emptyState.title')}
      description={
        canCreate
          ? t('emptyState.description')
          : t('emptyState.noAccessDescription')
      }
      action={
        canCreate || marketplaceUrl ? (
          <div className="flex flex-col items-center gap-3">
            {canCreate && (
              <CreateSkillMenu
                buttonText={t('createDialog.buttonTextFirst')}
                showIcon={true}
              />
            )}
            {marketplaceUrl && (
              <Button variant="ghost" size="sm" className="text-brand" asChild>
                <a
                  href={marketplaceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="skills-empty-marketplace"
                >
                  <Store />
                  {t('emptyState.browseMarketplace')}
                  <ExternalLink />
                </a>
              </Button>
            )}
          </div>
        ) : undefined
      }
    />
  );
}
