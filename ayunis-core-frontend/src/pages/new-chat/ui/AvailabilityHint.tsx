import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Database, Sparkles } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@ayunis/ui/components/alert';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@ayunis/ui/components/popover';
import { Separator } from '@ayunis/ui/components/separator';
import {
  useIsKnowledgeBasesEnabled,
  useIsSkillsEnabled,
} from '@/features/feature-toggles';
import {
  useKnowledgeBasesControllerFindAll,
  useSkillsControllerFindAll,
  useWorkspaceContextControllerFindContext,
} from '@/shared/api/generated/ayunisCoreAPI';
import { AvailabilityEntryList } from '@/pages/chat-context-prototype/ui/availability/AvailabilityDropdowns';

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function AvailabilityHint({
  workspaceId,
}: Readonly<{ workspaceId: string | null }>) {
  const skillsEnabled = useIsSkillsEnabled();
  const knowledgeBasesEnabled = useIsKnowledgeBasesEnabled();
  const { data: skills } = useSkillsControllerFindAll({
    query: { enabled: skillsEnabled },
  });
  const { data: knowledgeBases } = useKnowledgeBasesControllerFindAll({
    query: { enabled: knowledgeBasesEnabled },
  });
  const { data: workspaceContext } = useWorkspaceContextControllerFindContext(
    workspaceId ?? '',
    { query: { enabled: Boolean(workspaceId) } },
  );

  const projectSkills = workspaceContext?.skills.length ?? 0;
  const projectKnowledge =
    (workspaceContext?.knowledgeBases.length ?? 0) +
    (workspaceContext?.documents.length ?? 0);
  const skillCount = (skills?.length ?? 0) + projectSkills;
  const knowledgeCount = (knowledgeBases?.data.length ?? 0) + projectKnowledge;

  if (skillCount === 0 && knowledgeCount === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground"
        >
          <Sparkles />
          {plural(skillCount, 'Fähigkeit', 'Fähigkeiten')}
          <span aria-hidden>·</span>
          <Database />
          {plural(knowledgeCount, 'Wissensdatenbank', 'Wissensdatenbanken')}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="flex flex-col gap-3 text-sm">
          <AvailabilityNote title="Immer dabei">
            Alle Fähigkeiten und Wissensdatenbanken stehen in jedem Chat bereit.
            Ayunis Core aktiviert eine Fähigkeit, sobald Ihre Nachricht dazu
            passt, und durchsucht Wissen bei Bedarf. Sie müssen nichts anhängen.
          </AvailabilityNote>
          <Separator />
          <Section
            title="Fähigkeiten"
            qualifier="automatisch aktiviert"
            entries={(skills ?? []).map((skill) => ({
              id: skill.id,
              name: skill.name,
              description: skill.shortDescription,
            }))}
          />
          <Section
            title="Wissensdatenbanken"
            qualifier="bei Bedarf durchsucht"
            entries={(knowledgeBases?.data ?? []).map((base) => ({
              id: base.id,
              name: base.name,
              description: base.description,
            }))}
          />
          {workspaceId && (
            <>
              <Separator />
              <ProjectBreakdown
                projectSkills={projectSkills}
                projectKnowledge={projectKnowledge}
              />
            </>
          )}
          <Separator />
          <div className="flex gap-3 text-xs">
            <Link to="/skills" className="underline underline-offset-4">
              Fähigkeiten verwalten
            </Link>
            <Link
              to="/knowledge-bases"
              className="underline underline-offset-4"
            >
              Wissen verwalten
            </Link>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AvailabilityNote({
  title,
  children,
}: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <Alert className="border-transparent bg-brand/8">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

function Section({
  title,
  qualifier,
  entries,
}: Readonly<{
  title: string;
  qualifier: string;
  entries: { id: string; name: string; description: string }[];
}>) {
  if (entries.length === 0) return null;
  return (
    <section className="flex flex-col gap-1">
      <h4 className="text-xs text-muted-foreground">
        <span className="font-medium">{title}</span> · {qualifier}
      </h4>
      <AvailabilityEntryList entries={entries} />
    </section>
  );
}

function ProjectBreakdown({
  projectSkills,
  projectKnowledge,
}: Readonly<{ projectSkills: number; projectKnowledge: number }>) {
  if (projectSkills === 0 && projectKnowledge === 0) {
    return (
      <p className="text-muted-foreground">
        Dieses Projekt bringt noch nichts Eigenes mit. Was Sie dort hinterlegen,
        gilt danach in allen Chats des Projekts.
      </p>
    );
  }
  return (
    <p className="text-muted-foreground">
      Davon aus dem Projekt: {plural(projectSkills, 'Fähigkeit', 'Fähigkeiten')}{' '}
      und {plural(projectKnowledge, 'Wissensquelle', 'Wissensquellen')} — die
      gelten in jedem Chat dieses Projekts, ohne Auswahl.
    </p>
  );
}
