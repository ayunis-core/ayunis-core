import CreateSkillMenu from './CreateSkillMenu';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  ExternalLink,
  MessageSquareText,
  PencilLine,
  Sparkles,
  Store,
} from 'lucide-react';
import { EmptyState } from '@/widgets/empty-state';
import { ChatStarter, type ChatStarterDefaults } from '@/widgets/chat-starter';
import { Button } from '@ayunis/ui/components/button';
import { useSkillMarketplaceUrl } from '@/features/marketplace';
import { useMyPermissions } from '@/features/permissions';

interface SkillsEmptyStateProps {
  chatStarter: ChatStarterDefaults;
}

export default function SkillsEmptyState({
  chatStarter,
}: Readonly<SkillsEmptyStateProps>) {
  const { t } = useTranslation('skills');
  const marketplaceUrl = useSkillMarketplaceUrl();
  const { can, isLoading: isLoadingPermissions } = useMyPermissions();
  // Assume can-create while permissions load, matching CreateSkillMenu, so the
  // prompt doesn't flicker; drop the create copy/action only once we know the
  // member lacks the permission (they can still read skills shared with them).
  const canCreate = isLoadingPermissions || can('manage_skills');

  return (
    <EmptyState
      testId="skills-empty-state"
      icon={Sparkles}
      title={t('emptyState.title')}
      description={
        canCreate
          ? t('emptyState.description')
          : t('emptyState.noAccessDescription')
      }
      steps={[
        {
          icon: PencilLine,
          title: t('emptyState.steps.describe.title'),
          description: t('emptyState.steps.describe.description'),
        },
        {
          icon: BookOpen,
          title: t('emptyState.steps.enrich.title'),
          description: t('emptyState.steps.enrich.description'),
        },
        {
          icon: MessageSquareText,
          title: t('emptyState.steps.use.title'),
          description: t('emptyState.steps.use.description'),
        },
      ]}
      helpPath="skills/"
      action={
        canCreate || marketplaceUrl ? (
          <>
            {canCreate && (
              <CreateSkillMenu
                buttonText={t('createDialog.buttonTextFirst')}
                showIcon={true}
              />
            )}
            {marketplaceUrl && (
              <Button variant="ghost" className="text-brand" asChild>
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
          </>
        ) : undefined
      }
      guide={
        <ChatStarter
          {...chatStarter}
          origin={{ kind: 'feature_guide', feature: 'skills' }}
          placeholder={t('emptyState.askPlaceholder')}
        />
      }
    />
  );
}
