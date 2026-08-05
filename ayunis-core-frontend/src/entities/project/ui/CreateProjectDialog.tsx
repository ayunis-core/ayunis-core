import { ProjectAppearancePicker } from './ProjectAppearancePicker';
import { useState } from 'react';
import { Lock, Building2, Check, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/shadcn/dialog';
import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import { Textarea } from '@/shared/ui/shadcn/textarea';
import { Label } from '@/shared/ui/shadcn/label';
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
} from '@/shared/ui/shadcn/item';
import { RoleSelect } from './RoleSelect';
import { FEATURES } from '../model/iteration';
import {
  defaultProjectColor,
  type ProjectColor,
  type ProjectIconKey,
} from '../model/appearance';
import { cn } from '@/shared/lib/shadcn/utils';
import {
  CURRENT_USER,
  orgTeams,
  type MockProject,
  type OrgTeam,
  type ProjectRole,
  type ProjectVisibility,
} from '../model/mock';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (project: MockProject) => void;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onCreate,
}: Readonly<CreateProjectDialogProps>) {
  const [step, setStep] = useState<1 | 2>(1);
  const [icon, setIcon] = useState<ProjectIconKey>('folder');
  const [color, setColor] = useState<ProjectColor | null>(null);
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [mode, setMode] = useState<'private' | 'teams' | 'org'>('private');
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [teamRoles, setTeamRoles] = useState<Record<string, ProjectRole>>({});

  const effectiveColor = color ?? defaultProjectColor(name);

  function selectMode(next: 'private' | 'teams' | 'org') {
    setMode(next);
    if (next !== 'teams') setTeamIds([]);
  }

  function toggleTeam(id: string) {
    setTeamIds((cur) =>
      cur.includes(id) ? cur.filter((t) => t !== id) : [...cur, id],
    );
  }

  function reset() {
    setStep(1);
    setName('');
    setInstructions('');
    setIcon('folder');
    setColor(null);
    setMode('private');
    setTeamIds([]);
    setTeamRoles({});
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  const canContinue = name.trim().length > 0;
  const stepTitle = step === 1 ? 'Worum geht es?' : 'Wer hat Zugriff?';
  const stepHint = FEATURES.sharing
    ? `Schritt ${step} von 2 · ${stepTitle}`
    : 'Worum geht es?';
  const canCreate = canContinue && (mode !== 'teams' || teamIds.length > 0);

  function handleCreate() {
    const visibility: ProjectVisibility = mode === 'org' ? 'org' : 'private';
    onCreate({
      id: crypto.randomUUID(),
      name: name.trim(),
      icon,
      color: effectiveColor,
      instructions: instructions.trim() || undefined,
      ownerId: CURRENT_USER.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      visibility,
      starred: true,
      allowMemberContent: true,
      allowPrivateChats: true,
      skills: [],
      knowledgeBases: [],
      documents: [],
      teams:
        mode === 'teams'
          ? orgTeams
              .filter((t) => teamIds.includes(t.id))
              .map((t) => ({ ...t, role: teamRoles[t.id] ?? 'use' }))
          : [],
      collaborators: [CURRENT_USER],
      chats: [],
    });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader className="shrink-0">
          <DialogTitle>Projekt erstellen</DialogTitle>
          <DialogDescription>{stepHint}</DialogDescription>
        </DialogHeader>

        <div className="-mx-4 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-1">
          {step === 1 ? (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="project-name">Woran arbeiten Sie?</Label>
                <Input
                  id="project-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z. B. Bürgeranfragen"
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="project-instructions">
                  Was möchten Sie erreichen?
                </Label>
                <Textarea
                  id="project-instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Beschreiben Sie Ihr Projekt, Ihre Ziele, Ihr Thema usw."
                  rows={3}
                />
              </div>

              <ProjectAppearancePicker
                icon={icon}
                color={effectiveColor}
                onIconChange={setIcon}
                onColorChange={setColor}
              />
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <Label>Sichtbarkeit</Label>
                <VisibilityOption
                  icon={Lock}
                  title="Privat"
                  description="Nur Sie — Mitglieder können später eingeladen werden"
                  selected={mode === 'private'}
                  onSelect={() => selectMode('private')}
                />
                <VisibilityOption
                  icon={Users}
                  title="Teams"
                  description="Ausgewählte Teams können dieses Projekt sehen und nutzen"
                  selected={mode === 'teams'}
                  onSelect={() => selectMode('teams')}
                />
                <VisibilityOption
                  icon={Building2}
                  title="Organisation"
                  description="Alle in Ihrer Organisation können dieses Projekt sehen und nutzen"
                  selected={mode === 'org'}
                  onSelect={() => selectMode('org')}
                />
              </div>

              {mode === 'teams' && (
                <div className="flex flex-col gap-2">
                  <Label>Teams auswählen</Label>
                  {orgTeams.map((team) => (
                    <TeamOption
                      key={team.id}
                      team={team}
                      selected={teamIds.includes(team.id)}
                      role={teamRoles[team.id] ?? 'use'}
                      onToggle={() => toggleTeam(team.id)}
                      onRoleChange={(role) =>
                        setTeamRoles((cur) => ({ ...cur, [team.id]: role }))
                      }
                    />
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Einzelne Personen laden Sie nach dem Erstellen über „Teilen"
                    ein.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="shrink-0">
          {step === 1 ? (
            <>
              <Button variant="ghost" onClick={() => handleOpenChange(false)}>
                Abbrechen
              </Button>
              {FEATURES.sharing ? (
                <Button onClick={() => setStep(2)} disabled={!canContinue}>
                  Weiter
                </Button>
              ) : (
                <Button onClick={handleCreate} disabled={!canContinue}>
                  Projekt erstellen
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep(1)}>
                Zurück
              </Button>
              <Button onClick={handleCreate} disabled={!canCreate}>
                Projekt erstellen
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TeamOption({
  team,
  selected,
  role,
  onToggle,
  onRoleChange,
}: Readonly<{
  team: OrgTeam;
  selected: boolean;
  role: ProjectRole;
  onToggle: () => void;
  onRoleChange: (role: ProjectRole) => void;
}>) {
  return (
    <Item
      variant="outline"
      size="sm"
      className={cn('cursor-pointer', selected && 'border-brand bg-brand/5')}
      onClick={onToggle}
    >
      <ItemMedia variant="icon" className="self-center translate-y-0">
        <Users />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{team.name}</ItemTitle>
        <ItemDescription className="text-xs">
          {team.memberCount} Personen
        </ItemDescription>
      </ItemContent>
      <ItemActions className="self-center" onClick={(e) => e.stopPropagation()}>
        {selected ? (
          <RoleSelect
            value={role}
            onChange={onRoleChange}
            triggerClassName="h-8 w-40 shrink-0"
          />
        ) : (
          <Check className="size-4 text-transparent" />
        )}
      </ItemActions>
    </Item>
  );
}

interface VisibilityOptionProps {
  icon: typeof Lock;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}

function VisibilityOption({
  icon: Icon,
  title,
  description,
  selected,
  onSelect,
}: Readonly<VisibilityOptionProps>) {
  return (
    <Item
      variant="outline"
      size="sm"
      className={cn('cursor-pointer', selected && 'border-brand bg-brand/5')}
      onClick={onSelect}
    >
      <ItemMedia variant="icon" className="self-center translate-y-0">
        <Icon />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{title}</ItemTitle>
        <ItemDescription className="text-xs">{description}</ItemDescription>
      </ItemContent>
      {selected && (
        <ItemActions className="self-center">
          <Check className="size-4 text-brand" />
        </ItemActions>
      )}
    </Item>
  );
}
