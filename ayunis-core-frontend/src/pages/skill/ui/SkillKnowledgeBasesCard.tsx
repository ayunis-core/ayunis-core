import { useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Button } from '@ayunis/ui/components/button';
import { Skeleton } from '@ayunis/ui/components/skeleton';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { SkillKnowledgeBasesCard as SharedSkillKnowledgeBasesCard } from '@/widgets/skill-knowledge-bases-card';
import {
  useAssignKnowledgeBase,
  useSkillKnowledgeBasesQueries,
  useUnassignKnowledgeBase,
} from '@/pages/skill/api';
import { mergeSkillKnowledgeBases } from '@/pages/skill/lib/merge-skill-knowledge-bases';

export default function SkillKnowledgeBasesCard({
  disabled = false,
}: Readonly<{ disabled?: boolean }>) {
  const { t } = useTranslation('skill');
  const { id: skillId } = useParams({ from: '/_authenticated/skills/$id' });
  const data = useSkillKnowledgeBasesQueries(skillId);
  const assignMutation = useAssignKnowledgeBase(data.availableKnowledgeBases);
  const unassignMutation = useUnassignKnowledgeBase();

  if (data.isLoading || data.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('knowledgeBases.title')}</CardTitle>
          <CardDescription>{t('knowledgeBases.description')}</CardDescription>
          <CardAction>
            <HelpLink path="skills/knowledge-collections/" variant="icon" />
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.isLoading ? (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <p className="mb-4 text-sm text-destructive">
                {t('knowledgeBases.errors.failedToLoad')}
              </p>
              <Button variant="link" onClick={data.refetch}>
                {t('knowledgeBases.retryButton')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const assignedIds = (data.assignedKnowledgeBases ?? []).map(({ id }) => id);
  const knowledgeBases = mergeSkillKnowledgeBases(
    data.availableKnowledgeBases ?? [],
    data.assignedKnowledgeBases ?? [],
  );

  return (
    <SharedSkillKnowledgeBasesCard
      knowledgeBases={knowledgeBases}
      assignedIds={assignedIds}
      disabled={disabled}
      isPending={assignMutation.isPending || unassignMutation.isPending}
      onToggle={(knowledgeBaseId) => {
        if (assignedIds.includes(knowledgeBaseId)) {
          unassignMutation.mutate({ skillId, knowledgeBaseId });
        } else {
          assignMutation.mutate({ skillId, knowledgeBaseId });
        }
      }}
    />
  );
}
