import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Brain, ChevronDown, Sparkles } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@ayunis/ui/components/popover';
import {
  useKnowledgeBasesControllerFindAll,
  useSkillsControllerFindAll,
  useWorkspaceContextControllerFindContext,
} from '@/shared/api/generated/ayunisCoreAPI';
import { personalSkillListParams } from '@/shared/api/skill-scopes';
import { personalKnowledgeBaseListParams } from '@/shared/api/knowledge-base-scopes';
import {
  useIsKnowledgeBasesEnabled,
  useIsSkillsEnabled,
} from '@/features/feature-toggles';

interface AvailableContextMenusProps {
  workspaceId?: string | null;
}

interface ContextEntry {
  id: string;
  name: string;
  isShared: boolean;
}

function mergeEntries(...lists: ContextEntry[][]): ContextEntry[] {
  const byId = new Map<string, ContextEntry>();
  for (const entry of lists.flat()) {
    if (!byId.has(entry.id)) byId.set(entry.id, entry);
  }
  return [...byId.values()];
}

export function AvailableContextMenus({
  workspaceId,
}: Readonly<AvailableContextMenusProps>) {
  const skillsEnabled = useIsSkillsEnabled();
  const knowledgeBasesEnabled = useIsKnowledgeBasesEnabled();
  const { data: skillsResponse } = useSkillsControllerFindAll(
    personalSkillListParams,
    { query: { enabled: skillsEnabled } },
  );
  const { data: knowledgeResponse } = useKnowledgeBasesControllerFindAll(
    personalKnowledgeBaseListParams,
    { query: { enabled: knowledgeBasesEnabled } },
  );
  const workspaceContext = useWorkspaceContextControllerFindContext(
    workspaceId ?? '',
    {
      query: {
        enabled:
          (skillsEnabled || knowledgeBasesEnabled) && Boolean(workspaceId),
      },
    },
  );

  const workspaceSkills = workspaceId
    ? (workspaceContext.data?.skills.filter((s) => s.isActive) ?? [])
    : [];
  const workspaceKnowledge = workspaceId
    ? (workspaceContext.data?.knowledgeBases ?? [])
    : [];

  const skillEntries = mergeEntries(
    workspaceSkills.map((s) => ({ id: s.id, name: s.name, isShared: true })),
    (skillsResponse?.data ?? [])
      .filter((s) => s.isActive)
      .map((s) => ({ id: s.id, name: s.name, isShared: s.isShared })),
  );

  const knowledgeEntries = mergeEntries(
    workspaceKnowledge.map((k) => ({ id: k.id, name: k.name, isShared: true })),
    (knowledgeResponse?.data ?? []).map((k) => ({
      id: k.id,
      name: k.name,
      isShared: false,
    })),
  );

  return (
    <>
      {skillsEnabled && (
        <ContextPopover
          icon={<Sparkles className="size-3.5" />}
          countKey="availableContext.skillCount"
          hintKey="availableContext.skillsHint"
          emptyKey="availableContext.skillsEmpty"
          manageKey="availableContext.manageSkills"
          manageTo="/skills"
          testId="available-skills"
          entries={skillEntries}
        />
      )}
      {knowledgeBasesEnabled && (
        <ContextPopover
          icon={<Brain className="size-3.5" />}
          countKey="availableContext.knowledgeCount"
          hintKey="availableContext.knowledgeHint"
          emptyKey="availableContext.knowledgeEmpty"
          manageKey="availableContext.manageKnowledge"
          manageTo="/knowledge-bases"
          testId="available-knowledge"
          entries={knowledgeEntries}
        />
      )}
    </>
  );
}

function ContextPopover({
  icon,
  countKey,
  hintKey,
  emptyKey,
  manageKey,
  manageTo,
  testId,
  entries,
}: Readonly<{
  icon: ReactNode;
  countKey: string;
  hintKey: string;
  emptyKey: string;
  manageKey: string;
  manageTo: string;
  testId: string;
  entries: ContextEntry[];
}>) {
  const { t } = useTranslation('common');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground h-7 px-2 text-xs"
          data-testid={`${testId}-menu`}
        >
          {icon}
          {t(countKey, { count: entries.length })}
          <ChevronDown className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" collisionPadding={8} className="w-72 p-0">
        <p className="text-muted-foreground border-b px-3 py-2 text-xs">
          {t(hintKey)}
        </p>
        {entries.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <p className="text-muted-foreground text-xs">{t(emptyKey)}</p>
            <Button
              variant="link"
              size="sm"
              asChild
              className="mt-1 h-auto text-xs"
            >
              <Link to={manageTo}>{t(manageKey)}</Link>
            </Button>
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto p-1">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-2 px-2 py-1"
                data-testid={`${testId}-${entry.id}`}
              >
                <span className="truncate text-sm">{entry.name}</span>
                {entry.isShared && (
                  <Badge variant="secondary" className="shrink-0 font-normal">
                    {t('availableContext.sharedBadge')}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
