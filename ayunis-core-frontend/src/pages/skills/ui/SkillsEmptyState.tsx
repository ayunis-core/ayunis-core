import CreateSkillDialog from './CreateSkillDialog';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Store } from 'lucide-react';
import { EmptyState } from '@/widgets/empty-state';
import { Button } from '@/shared/ui/shadcn/button';
import { useMarketplaceConfig } from '@/features/marketplace';
import { useMyPermissions } from '@/features/permissions';

export default function SkillsEmptyState() {
  const { t } = useTranslation('skills');
  const marketplace = useMarketplaceConfig();
  const { can, isLoading: isLoadingPermissions } = useMyPermissions();
  // Assume can-create while permissions load, matching CreateSkillDialog, so the
  // prompt doesn't flicker; drop the create copy/action only once we know the
  // member lacks the permission (they can still read skills shared with them).
  const canCreate = isLoadingPermissions || can('manage_skills');

  return (
    <EmptyState
      title={t('emptyState.title')}
      description={
        canCreate
          ? t('emptyState.description')
          : t('emptyState.noAccessDescription')
      }
      action={
        canCreate ? (
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
        ) : undefined
      }
    />
  );
}
