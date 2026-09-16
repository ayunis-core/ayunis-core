import { useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Brain, Check, Sparkles } from 'lucide-react';
import { cn } from '@ayunis/ui/lib/cn';
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
export interface AttachableSkill {
  id: string;
  name: string;
  workspaceId?: string;
}

interface AvailableContextMenusProps {
  workspaceId?: string | null;
  selectedSkillId?: string;
  onSkillSelect?: (skill: AttachableSkill) => void;
}

interface ContextEntry {
  id: string;
  name: string;
  isShared: boolean;
  workspaceId?: string;
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
  selectedSkillId,
  onSkillSelect,
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
    workspaceSkills.map((s) => ({
      id: s.id,
      name: s.name,
      isShared: true,
      workspaceId: workspaceId ?? undefined,
    })),
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
          icon={<Sparkles />}
          countKey="availableContext.skillCount"
          hintKey="availableContext.skillsHint"
          emptyKey="availableContext.skillsEmpty"
          manageKey="availableContext.manageSkills"
          manageTo="/skills"
          testId="available-skills"
          entries={skillEntries}
          selectedId={selectedSkillId}
          onSelect={onSkillSelect}
        />
      )}
      {knowledgeBasesEnabled && (
        <ContextPopover
          icon={<Brain />}
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
  selectedId,
  onSelect,
}: Readonly<{
  icon: ReactNode;
  countKey: string;
  hintKey: string;
  emptyKey: string;
  manageKey: string;
  manageTo: string;
  testId: string;
  entries: ContextEntry[];
  selectedId?: string;
  onSelect?: (entry: ContextEntry) => void;
}>) {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);

  function handleSelect(entry: ContextEntry) {
    onSelect?.(entry);
    setIsOpen(false);
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          data-testid={`${testId}-menu`}
        >
          {icon}
          {t(countKey, { count: entries.length })}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" collisionPadding={8} className="w-72 p-0">
        <p className="text-muted-foreground border-b px-3 py-2 text-xs">
          {t(hintKey)}
        </p>
        {entries.length === 0 ? (
          <p className="text-muted-foreground px-3 py-4 text-center text-xs">
            {t(emptyKey)}
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto p-1">
            {entries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                isSelected={entry.id === selectedId}
                onSelect={onSelect && handleSelect}
                testId={testId}
              />
            ))}
          </div>
        )}
        <div className="border-t p-1">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-muted-foreground w-full justify-start font-normal"
          >
            <Link to={manageTo} data-testid={`${testId}-manage`}>
              {t(manageKey)}
              <ArrowUpRight className="ml-auto" />
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function EntryRow({
  entry,
  isSelected,
  onSelect,
  testId,
}: Readonly<{
  entry: ContextEntry;
  isSelected: boolean;
  onSelect?: (entry: ContextEntry) => void;
  testId: string;
}>) {
  const { t } = useTranslation('common');
  const content = (
    <>
      <span className="truncate">{entry.name}</span>
      {entry.isShared && (
        <Badge variant="secondary" className="shrink-0 font-normal">
          {t('availableContext.sharedBadge')}
        </Badge>
      )}
      {onSelect && (
        <Check
          className={cn('ml-auto size-4 shrink-0', !isSelected && 'invisible')}
        />
      )}
    </>
  );

  if (!onSelect) {
    return (
      <div
        className="flex items-center gap-2 px-2 py-1 text-sm"
        data-testid={`${testId}-${entry.id}`}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(entry)}
      aria-pressed={isSelected}
      className="hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm"
      data-testid={`${testId}-${entry.id}`}
    >
      {content}
    </button>
  );
}
