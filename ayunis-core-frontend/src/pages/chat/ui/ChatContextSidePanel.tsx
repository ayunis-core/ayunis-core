import { AlertTriangle, Brain, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertTitle } from '@ayunis/ui/components/alert';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { ScrollArea } from '@ayunis/ui/components/scroll-area';
import { Skeleton } from '@ayunis/ui/components/skeleton';
import { useThreadAiContext } from '@/pages/chat/api/useThreadAiContext';
import {
  useIsKnowledgeBasesEnabled,
  useIsSkillsEnabled,
} from '@/features/feature-toggles';
import type {
  ThreadAiContextKnowledgeBaseResponseDto,
  ThreadAiContextSkillResponseDto,
} from '@/shared/api';

interface ChatContextSidePanelProps {
  readonly threadId: string;
}

export function ChatContextSidePanel({
  threadId,
}: Readonly<ChatContextSidePanelProps>) {
  const { t } = useTranslation('chat');
  const skillsEnabled = useIsSkillsEnabled();
  const knowledgeBasesEnabled = useIsKnowledgeBasesEnabled();
  const contextEnabled = skillsEnabled || knowledgeBasesEnabled;
  const { context, isLoading, error, refetch } = useThreadAiContext(
    threadId,
    contextEnabled,
  );

  if (!contextEnabled) return null;
  if (isLoading) return <ContextLoading />;
  if (error || !context) {
    return (
      <div className="p-4" data-testid="chat-context-error">
        <Alert variant="warning">
          <AlertTriangle />
          <AlertTitle>{t('chat.context.loadError')}</AlertTitle>
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              data-testid="chat-context-retry"
              onClick={() => void refetch()}
            >
              {t('chat.context.retry')}
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="space-y-6 p-4" data-testid="chat-context-content">
        {skillsEnabled && <SkillsSection skills={context.skills} />}
        {knowledgeBasesEnabled && (
          <KnowledgeBasesSection knowledgeBases={context.knowledgeBases} />
        )}
      </div>
    </ScrollArea>
  );
}

function SkillsSection({
  skills,
}: Readonly<{ skills: ThreadAiContextSkillResponseDto[] }>) {
  const { t } = useTranslation('chat');
  return (
    <section data-testid="chat-context-section-skills">
      <h3 className="mb-2 text-sm font-semibold">
        {t('chat.context.skills.title')}
      </h3>
      {skills.length === 0 ? (
        <SectionEmpty
          testId="chat-context-skills-empty"
          title={t('chat.context.skills.empty')}
        />
      ) : (
        <ItemGroup className="gap-2">
          {skills.map((skill) => (
            <SkillItem key={skill.id} skill={skill} />
          ))}
        </ItemGroup>
      )}
    </section>
  );
}

function SkillItem({
  skill,
}: Readonly<{ skill: ThreadAiContextSkillResponseDto }>) {
  return (
    <Item
      variant="outline"
      size="sm"
      data-testid={`chat-context-skill-${skill.id}`}
    >
      <ItemMedia variant="icon">
        <Sparkles />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className="max-w-full">
          <span className="truncate">{skill.name}</span>
          <WorkspaceScope
            resource="skill"
            id={skill.id}
            workspaceId={skill.workspaceId}
          />
        </ItemTitle>
        <ItemDescription>{skill.shortDescription}</ItemDescription>
      </ItemContent>
    </Item>
  );
}

function KnowledgeBasesSection({
  knowledgeBases,
}: Readonly<{ knowledgeBases: ThreadAiContextKnowledgeBaseResponseDto[] }>) {
  const { t } = useTranslation('chat');
  return (
    <section data-testid="chat-context-section-knowledge-bases">
      <h3 className="mb-2 text-sm font-semibold">
        {t('chat.context.knowledgeBases.title')}
      </h3>
      {knowledgeBases.length === 0 ? (
        <SectionEmpty
          testId="chat-context-knowledge-bases-empty"
          title={t('chat.context.knowledgeBases.empty')}
        />
      ) : (
        <ItemGroup className="gap-2">
          {knowledgeBases.map((knowledgeBase) => (
            <KnowledgeBaseItem
              key={knowledgeBase.id}
              knowledgeBase={knowledgeBase}
            />
          ))}
        </ItemGroup>
      )}
    </section>
  );
}

function KnowledgeBaseItem({
  knowledgeBase,
}: Readonly<{
  knowledgeBase: ThreadAiContextKnowledgeBaseResponseDto;
}>) {
  const { t } = useTranslation('chat');
  return (
    <Item
      variant="outline"
      size="sm"
      data-testid={`chat-context-knowledge-base-${knowledgeBase.id}`}
    >
      <ItemMedia variant="icon">
        <Brain />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className="max-w-full">
          <span className="truncate">{knowledgeBase.name}</span>
          <WorkspaceScope
            resource="knowledge-base"
            id={knowledgeBase.id}
            workspaceId={knowledgeBase.workspaceId}
          />
        </ItemTitle>
        <ItemDescription>
          {t('chat.context.knowledgeBases.documents', {
            count: knowledgeBase.documentCount,
          })}
        </ItemDescription>
      </ItemContent>
    </Item>
  );
}

function WorkspaceScope({
  resource,
  id,
  workspaceId,
}: Readonly<{
  resource: 'skill' | 'knowledge-base';
  id: string;
  workspaceId: string | null;
}>) {
  const { t } = useTranslation('chat');
  if (!workspaceId) return null;
  return (
    <Badge
      variant="secondary"
      data-testid={`chat-context-${resource}-scope-${id}`}
    >
      {t('chat.context.workspaceScope')}
    </Badge>
  );
}

function SectionEmpty({
  testId,
  title,
}: Readonly<{ testId: string; title: string }>) {
  return (
    <div
      className="flex min-h-28 items-center justify-center rounded-lg border p-4 text-center text-sm font-medium"
      data-testid={testId}
    >
      {title}
    </div>
  );
}

function ContextLoading() {
  return (
    <div className="space-y-6 p-4" data-testid="chat-context-loading">
      {[0, 1].map((section) => (
        <div key={section} className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ))}
    </div>
  );
}
