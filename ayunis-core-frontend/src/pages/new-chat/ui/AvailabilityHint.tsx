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
import {
  AvailabilityEntryList,
  type AvailabilityEntry,
} from '@/shared/ui/availability-entry-list';

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

  const skillEntries = mergeById(
    (skills ?? [])
      .filter((skill) => skill.isActive)
      .map((skill) => ({
        id: skill.id,
        name: skill.name,
        description: skill.shortDescription,
      })),
    (workspaceContext?.skills ?? []).map((skill) => ({
      id: skill.id,
      name: skill.name,
      description: skill.shortDescription,
    })),
  );
  const knowledgeEntries = mergeById(
    (knowledgeBases?.data ?? []).map((base) => ({
      id: base.id,
      name: base.name,
      description: base.description,
    })),
    (workspaceContext?.knowledgeBases ?? []).map((base) => ({
      id: base.id,
      name: base.name,
      description: base.description ?? '',
    })),
  );
  const projectDocuments = workspaceContext?.documents.length ?? 0;

  if (skillEntries.length === 0 && knowledgeEntries.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground"
        >
          <Sparkles />
          {plural(skillEntries.length, 'Fähigkeit', 'Fähigkeiten')}
          <span aria-hidden>·</span>
          <Database />
          {plural(
            knowledgeEntries.length,
            'Wissenssammlung',
            'Wissenssammlungen',
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="flex flex-col gap-3 text-sm">
          <AvailabilityNote title="Ayunis Core wählt selbst aus">
            Fähigkeiten werden passend zu Ihrer Nachricht aktiviert, Wissen bei
            Bedarf durchsucht.
          </AvailabilityNote>
          <Separator />
          <Section
            title="Fähigkeiten"
            qualifier="automatisch aktiviert"
            entries={skillEntries}
            linkTo="/skills/$id"
          />
          <Section
            title="Wissenssammlungen"
            qualifier="bei Bedarf durchsucht"
            entries={knowledgeEntries}
            linkTo="/knowledge-bases/$id"
          />
          {workspaceId && (
            <>
              <Separator />
              <ProjectBreakdown
                projectSkills={workspaceContext?.skills.length ?? 0}
                projectKnowledge={workspaceContext?.knowledgeBases.length ?? 0}
                projectDocuments={projectDocuments}
              />
            </>
          )}
          <Separator />
          <div className="flex gap-3 text-xs">
            <Link to="/skills" className="text-primary hover:underline">
              Fähigkeiten verwalten
            </Link>
            <Link
              to="/knowledge-bases"
              className="text-primary hover:underline"
            >
              Wissenssammlungen verwalten
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
  linkTo,
}: Readonly<{
  title: string;
  qualifier: string;
  entries: AvailabilityEntry[];
  linkTo: '/skills/$id' | '/knowledge-bases/$id';
}>) {
  if (entries.length === 0) return null;
  return (
    <section className="flex flex-col gap-1">
      <h4 className="text-xs text-muted-foreground">
        <span className="font-medium">{title}</span> · {qualifier}
      </h4>
      <AvailabilityEntryList entries={entries} linkTo={linkTo} />
    </section>
  );
}

function mergeById(
  own: AvailabilityEntry[],
  fromProject: AvailabilityEntry[],
): AvailabilityEntry[] {
  const byId = new Map(own.map((entry) => [entry.id, entry]));
  for (const entry of fromProject) {
    byId.set(entry.id, entry);
  }
  return [...byId.values()];
}

function ProjectBreakdown({
  projectSkills,
  projectKnowledge,
  projectDocuments,
}: Readonly<{
  projectSkills: number;
  projectKnowledge: number;
  projectDocuments: number;
}>) {
  if (projectSkills === 0 && projectKnowledge === 0 && projectDocuments === 0) {
    return (
      <p className="text-muted-foreground">
        Dieses Projekt bringt noch nichts Eigenes mit. Was Sie dort hinterlegen,
        gilt danach in allen Chats des Projekts.
      </p>
    );
  }
  return (
    <p className="text-muted-foreground">
      Aus dem Projekt: {plural(projectSkills, 'Fähigkeit', 'Fähigkeiten')},{' '}
      {plural(projectKnowledge, 'Wissenssammlung', 'Wissenssammlungen')} und{' '}
      {plural(projectDocuments, 'Dokument', 'Dokumente')} — die gelten in jedem
      Chat dieses Projekts, ohne Auswahl.
    </p>
  );
}
