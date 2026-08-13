import type { ReactNode } from 'react';
import { Database, FileText, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import { Empty, EmptyHeader, EmptyTitle } from '@ayunis/ui/components/empty';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { ScrollArea } from '@ayunis/ui/components/scroll-area';
import {
  SourceResponseDtoStatus,
  type WorkspaceContextResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

export type WorkspaceContextPanel = 'skills' | 'knowledge' | 'instructions';

interface WorkspaceContextSidePanelProps {
  context: WorkspaceContextResponseDto;
  panel: WorkspaceContextPanel;
  onClose: () => void;
}

export function WorkspaceContextSidePanel({
  context,
  panel,
  onClose,
}: Readonly<WorkspaceContextSidePanelProps>) {
  const { t } = useTranslation('workspace');
  const titles: Record<WorkspaceContextPanel, string> = {
    skills: t('contextDock.skills.title'),
    knowledge: t('contextDock.knowledge.title'),
    instructions: t('contextDock.instructions.title'),
  };

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden border-l bg-background">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h2 className="truncate text-sm font-semibold" title={titles[panel]}>
          {titles[panel]}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onClose}
            aria-label={t('contextDock.close')}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-6 p-4">
          {panel === 'skills' && <SkillsPanel context={context} />}
          {panel === 'knowledge' && <KnowledgePanel context={context} />}
          {panel === 'instructions' && <InstructionsPanel context={context} />}
        </div>
      </ScrollArea>
    </aside>
  );
}

function SkillsPanel({
  context,
}: Readonly<{ context: WorkspaceContextResponseDto }>) {
  const { t } = useTranslation('workspace');
  if (context.skills.length === 0) {
    return <PanelEmpty text={t('contextDock.skills.empty')} />;
  }

  return (
    <PanelSection description={t('contextDock.skills.description')}>
      <ItemGroup className="gap-2">
        {context.skills.map((skill) => (
          <PanelItem
            key={skill.id}
            icon={<Sparkles />}
            title={skill.name}
            description={skill.shortDescription}
          />
        ))}
      </ItemGroup>
    </PanelSection>
  );
}

function KnowledgePanel({
  context,
}: Readonly<{ context: WorkspaceContextResponseDto }>) {
  const { t } = useTranslation('workspace');
  const hasKnowledge =
    context.knowledgeBases.length > 0 || context.documents.length > 0;
  if (!hasKnowledge) {
    return <PanelEmpty text={t('contextDock.knowledge.empty')} />;
  }

  return (
    <div className="space-y-6">
      {context.knowledgeBases.length > 0 && (
        <PanelSection title={t('contextDock.knowledge.knowledgeBases')}>
          <ItemGroup className="gap-2">
            {context.knowledgeBases.map((knowledgeBase) => (
              <PanelItem
                key={knowledgeBase.id}
                icon={<Database />}
                title={knowledgeBase.name}
                description={t('context.knowledge.documentCount', {
                  count: knowledgeBase.documentCount,
                })}
              />
            ))}
          </ItemGroup>
        </PanelSection>
      )}
      {context.documents.length > 0 && (
        <PanelSection title={t('contextDock.knowledge.documents')}>
          <ItemGroup className="gap-2">
            {context.documents.map((document) => (
              <PanelItem
                key={document.id}
                icon={<FileText />}
                title={document.name}
                description={
                  document.status ===
                  SourceResponseDtoStatus.ready ? undefined : (
                    <DocumentStatus status={document.status} />
                  )
                }
              />
            ))}
          </ItemGroup>
        </PanelSection>
      )}
    </div>
  );
}

function DocumentStatus({
  status,
}: Readonly<{ status: SourceResponseDtoStatus }>) {
  const { t } = useTranslation('workspace');
  return (
    <Badge variant="secondary">{t(`context.documents.status.${status}`)}</Badge>
  );
}

function InstructionsPanel({
  context,
}: Readonly<{ context: WorkspaceContextResponseDto }>) {
  const { t } = useTranslation('workspace');
  if (!context.instruction) {
    return <PanelEmpty text={t('contextDock.instructions.empty')} />;
  }

  return (
    <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm leading-relaxed text-muted-foreground">
      {context.instruction}
    </p>
  );
}

function PanelSection({
  title,
  description,
  children,
}: Readonly<{
  title?: string;
  description?: string;
  children: ReactNode;
}>) {
  return (
    <section className="space-y-2">
      {(title || description) && (
        <div className="space-y-1">
          {title && <h3 className="text-xs font-medium">{title}</h3>}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

function PanelItem({
  icon,
  title,
  description,
}: Readonly<{
  icon: ReactNode;
  title: string;
  description?: ReactNode;
}>) {
  return (
    <Item variant="outline" size="sm">
      <ItemMedia variant="icon">{icon}</ItemMedia>
      <ItemContent>
        <ItemTitle>{title}</ItemTitle>
        {description && <ItemDescription>{description}</ItemDescription>}
      </ItemContent>
    </Item>
  );
}

function PanelEmpty({ text }: Readonly<{ text: string }>) {
  return (
    <Empty className="rounded-md border border-dashed">
      <EmptyHeader>
        <EmptyTitle>{text}</EmptyTitle>
      </EmptyHeader>
    </Empty>
  );
}
