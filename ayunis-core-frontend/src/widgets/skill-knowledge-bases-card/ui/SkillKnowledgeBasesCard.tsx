import { useTranslation } from 'react-i18next';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { Badge } from '@ayunis/ui/components/badge';
import { Separator } from '@ayunis/ui/components/separator';
import { Switch } from '@ayunis/ui/components/switch';
import { cn } from '@ayunis/ui/lib/cn';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';

export interface SkillKnowledgeBaseItem {
  id: string;
  name: string;
  description?: string | null;
  isShared?: boolean;
}

export function SkillKnowledgeBasesCard({
  knowledgeBases,
  assignedIds,
  onToggle,
  disabled = false,
  isPending = false,
}: Readonly<{
  knowledgeBases: SkillKnowledgeBaseItem[];
  assignedIds: string[];
  onToggle: (knowledgeBaseId: string) => void;
  disabled?: boolean;
  isPending?: boolean;
}>) {
  const { t } = useTranslation('skill');

  if (knowledgeBases.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('knowledgeBases.title')}</CardTitle>
        <CardDescription>{t('knowledgeBases.description')}</CardDescription>
        <CardAction>
          <HelpLink path="skills/knowledge-collections/" variant="icon" />
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {knowledgeBases.map((knowledgeBase, index) => {
            const assigned = assignedIds.includes(knowledgeBase.id);
            return (
              <div key={knowledgeBase.id}>
                {index > 0 ? <Separator className="my-4" /> : null}
                <Item
                  className={cn(
                    index === 0 && 'pt-0',
                    index === knowledgeBases.length - 1 && 'pb-0',
                    'px-0',
                  )}
                >
                  <ItemContent>
                    <ItemTitle>
                      {knowledgeBase.name}
                      {knowledgeBase.isShared ? (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {t('knowledgeBases.sharedBadge')}
                        </Badge>
                      ) : null}
                    </ItemTitle>
                    {knowledgeBase.description ? (
                      <ItemDescription>
                        {knowledgeBase.description}
                      </ItemDescription>
                    ) : null}
                  </ItemContent>
                  <ItemActions>
                    <Switch
                      checked={assigned}
                      onCheckedChange={() => onToggle(knowledgeBase.id)}
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
