import { useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/shared/ui/shadcn/card';
import { Switch } from '@/shared/ui/shadcn/switch';
import { Separator } from '@/shared/ui/shadcn/separator';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/shared/ui/shadcn/item';
import { Button } from '@/shared/ui/shadcn/button';
import { cn } from '@/shared/lib/shadcn/utils';
import {
  useSkillKnowledgeBasesQueries,
  useAssignKnowledgeBase,
  useUnassignKnowledgeBase,
} from '../api';

export default function SkillKnowledgeBasesCard({
  disabled = false,
}: Readonly<{
  disabled?: boolean;
}>) {
  const { t } = useTranslation('skill');
  const { id: skillId } = useParams({ from: '/_authenticated/skills/$id' });

  const data = useSkillKnowledgeBasesQueries(skillId);
  const assignMutation = useAssignKnowledgeBase(data.availableKnowledgeBases);
  const unassignMutation = useUnassignKnowledgeBase();

  const handleToggle = (knowledgeBaseId: string) => {
    const isCurrentlyAssigned =
      data.assignedKnowledgeBases?.some((kb) => kb.id === knowledgeBaseId) ??
      false;
    if (isCurrentlyAssigned) {
      unassignMutation.mutate({ skillId, knowledgeBaseId });
    } else {
      assignMutation.mutate({ skillId, knowledgeBaseId });
    }
  };

  const isAssigned = (knowledgeBaseId: string): boolean => {
    return (
      data.assignedKnowledgeBases?.some((kb) => kb.id === knowledgeBaseId) ??
      false
    );
  };

  const isPending = assignMutation.isPending || unassignMutation.isPending;

  if (data.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('knowledgeBases.title')}</CardTitle>
          <CardDescription>{t('knowledgeBases.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('knowledgeBases.title')}</CardTitle>
          <CardDescription>{t('knowledgeBases.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-sm text-destructive mb-4">
              {t('knowledgeBases.errors.failedToLoad')}
            </p>
            <Button variant="link" onClick={data.refetch}>
              {t('knowledgeBases.retryButton')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (
    !data.availableKnowledgeBases ||
    data.availableKnowledgeBases.length === 0
  ) {
    return null;
  }

  const sortedKnowledgeBases = [...data.availableKnowledgeBases].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('knowledgeBases.title')}</CardTitle>
        <CardDescription>{t('knowledgeBases.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedKnowledgeBases.map((knowledgeBase, index) => {
            const assigned = isAssigned(knowledgeBase.id);

            return (
              <div key={knowledgeBase.id}>
                {index > 0 && <Separator className="my-4" />}
                <Item
                  className={cn(
                    index === 0 && 'pt-0',
                    index === sortedKnowledgeBases.length - 1 && 'pb-0',
                    'px-0',
                  )}
                >
                  <ItemContent>
                    <ItemTitle>{knowledgeBase.name}</ItemTitle>
                    {knowledgeBase.description && (
                      <ItemDescription>
                        {knowledgeBase.description}
                      </ItemDescription>
                    )}
                  </ItemContent>
                  <ItemActions>
                    <Switch
                      checked={assigned}
                      onCheckedChange={() => handleToggle(knowledgeBase.id)}
                      disabled={disabled || isPending}
                      aria-label={t('knowledgeBases.toggleAriaLabel', {
                        name: knowledgeBase.name,
                      })}
                    />
                  </ItemActions>
                </Item>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
