import { useState } from 'react';
import { ChevronRight, Users, Building2, RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui/shadcn/dialog';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select';
import { Avatar, AvatarFallback } from '@/shared/ui/shadcn/avatar';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/shared/ui/shadcn/item';
import { Switch } from '@/shared/ui/shadcn/switch';
import { Badge } from '@/shared/ui/shadcn/badge';
import { cn } from '@/shared/lib/shadcn/utils';
import {
  CURRENT_USER,
  orgPeople,
  orgTeams,
  PROJECT_ROLE_LABELS,
  type MockProject,
  type OrgPerson,
  type ProjectCollaborator,
  type ProjectRole,
  type ProjectTeam,
} from '../model/mock';
import {
  addCollaboratorToProject,
  updateCollaboratorRole,
  removeCollaboratorFromProject,
  setTeamMemberOverride,
  addTeamToProject,
  updateTeamRole,
  removeTeamFromProject,
  setProjectVisibility,
} from '../model/store';
import { RoleSelect } from './RoleSelect';

interface ShareProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: MockProject;
}

export function ShareProjectDialog({
  open,
  onOpenChange,
  project,
}: Readonly<ShareProjectDialogProps>) {
  const [selection, setSelection] = useState<string>('');
  const [role, setRole] = useState<ProjectRole>('use');

  const memberIds = project.collaborators.map((c) => c.id);
  const teamIds = project.teams.map((t) => t.id);
  const attachedTeamMemberIds = new Set(
    project.teams.flatMap(
      (t) => orgTeams.find((o) => o.id === t.id)?.memberIds ?? [],
    ),
  );
  const directCollaborators = project.collaborators.filter(
    (c) => c.id === CURRENT_USER.id || !attachedTeamMemberIds.has(c.id),
  );
  const ownerMember = directCollaborators.find((c) => c.id === project.ownerId);
  const otherCollaborators = directCollaborators.filter(
    (c) => c.id !== project.ownerId,
  );
  const invitablePeople = orgPeople.filter((p) => !memberIds.includes(p.id));
  const invitableTeams = orgTeams.filter((t) => !teamIds.includes(t.id));
  const canInvite = invitablePeople.length > 0 || invitableTeams.length > 0;

  function handleInvite() {
    if (selection.startsWith('team:')) {
      const team = invitableTeams.find(
        (t) => t.id === selection.replace('team:', ''),
      );
      if (team) addTeamToProject(project.id, { ...team, role });
    } else {
      const person = invitablePeople.find(
        (p) => p.id === selection.replace('person:', ''),
      );
      if (person)
        addCollaboratorToProject(project.id, {
          ...person,
          role,
          pending: true,
        });
    }
    setSelection('');
    setRole('use');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader className="shrink-0">
          <DialogTitle>Projekt teilen</DialogTitle>
          <DialogDescription>
            Mitglieder erhalten Zugriff auf Fähigkeiten, Wissen und Dokumente —
            Chats bleiben immer privat.
          </DialogDescription>
        </DialogHeader>

        {canInvite && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Select value={selection} onValueChange={setSelection}>
              <SelectTrigger className="w-full min-w-0 flex-1 basis-full sm:basis-0">
                <SelectValue placeholder="Person oder Team auswählen" />
              </SelectTrigger>
              <SelectContent>
                {invitableTeams.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Teams</SelectLabel>
                    {invitableTeams.map((team) => (
                      <SelectItem key={team.id} value={`team:${team.id}`}>
                        {team.name} ({team.memberCount} Personen)
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {invitablePeople.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Personen</SelectLabel>
                    {invitablePeople.map((person) => (
                      <SelectItem key={person.id} value={`person:${person.id}`}>
                        {person.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
            <RoleSelect value={role} onChange={setRole} />
            <Button
              className="shrink-0"
              onClick={handleInvite}
              disabled={!selection}
            >
              Einladen
            </Button>
          </div>
        )}

        <div className="-mx-4 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-4 py-1">
          {ownerMember && <MemberRow project={project} member={ownerMember} />}

          {project.visibility === 'org' && (
            <div className="flex items-center gap-3 rounded-md px-2 py-2">
              <Avatar className="size-8">
                <AvatarFallback>
                  <Building2 className="size-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">
                  Gesamte Organisation
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  Alle Mitglieder Ihrer Organisation
                </span>
              </div>
              <Badge variant="secondary">{PROJECT_ROLE_LABELS.use}</Badge>
            </div>
          )}

          {project.teams.map((team) => (
            <TeamRow key={team.id} project={project} team={team} />
          ))}

          {otherCollaborators.map((member) => (
            <MemberRow key={member.id} project={project} member={member} />
          ))}
        </div>

        <Item variant="outline" size="sm" className="shrink-0">
          <ItemMedia variant="icon">
            <Building2 />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Für gesamte Organisation freigeben</ItemTitle>
            <ItemDescription>
              Alle in Ihrer Organisation können dieses Projekt sehen und nutzen
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Switch
              checked={project.visibility === 'org'}
              onCheckedChange={(checked) =>
                setProjectVisibility(project.id, checked ? 'org' : 'private')
              }
              aria-label="Für gesamte Organisation freigeben"
            />
          </ItemActions>
        </Item>
      </DialogContent>
    </Dialog>
  );
}

function MemberRow({
  project,
  member,
}: Readonly<{ project: MockProject; member: ProjectCollaborator }>) {
  const isSelf = member.id === CURRENT_USER.id;
  return (
    <div className="flex items-center gap-3 rounded-md px-2 py-2">
      <Avatar className="size-8">
        <AvatarFallback className="text-[11px]">
          {member.initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <span className="truncate">
            {member.name}
            {isSelf && ' (Sie)'}
          </span>
          {member.pending && (
            <Badge
              variant="outline"
              className="shrink-0 text-[10px] text-muted-foreground"
            >
              Ausstehend
            </Badge>
          )}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {member.email}
        </span>
      </div>
      <MemberRoleControls project={project} member={member} />
    </div>
  );
}

function MemberRoleControls({
  project,
  member,
}: Readonly<{ project: MockProject; member: ProjectCollaborator }>) {
  if (member.id === project.ownerId) {
    return <Badge variant="secondary">Eigentümer</Badge>;
  }
  if (member.id === CURRENT_USER.id) {
    return (
      <Badge variant="secondary">{PROJECT_ROLE_LABELS[member.role]}</Badge>
    );
  }
  return (
    <RoleSelect
      value={member.role}
      onChange={(next) => updateCollaboratorRole(project.id, member.id, next)}
      onRemove={() => removeCollaboratorFromProject(project.id, member.id)}
    />
  );
}

function TeamRow({
  project,
  team,
}: Readonly<{ project: MockProject; team: ProjectTeam }>) {
  const [expanded, setExpanded] = useState(false);
  const teamDef = orgTeams.find((t) => t.id === team.id);
  const members = (teamDef?.memberIds ?? [])
    .map((id) => orgPeople.find((p) => p.id === id))
    .filter((p) => p !== undefined);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 rounded-md px-2 py-2">
        <Avatar className="size-8">
          <AvatarFallback>
            <Users className="size-4" />
          </AvatarFallback>
        </Avatar>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex min-w-0 flex-1 flex-col items-start text-left"
          aria-expanded={expanded}
        >
          <span className="flex items-center gap-1 truncate text-sm font-medium">
            {team.name}
            <ChevronRight
              className={cn(
                'size-3.5 text-muted-foreground transition-transform',
                expanded && 'rotate-90',
              )}
            />
          </span>
          <span className="text-xs text-muted-foreground">
            Team · {team.memberCount} Personen
          </span>
        </button>
        <RoleSelect
          value={team.role}
          onChange={(next) => updateTeamRole(project.id, team.id, next)}
          onRemove={() => removeTeamFromProject(project.id, team.id)}
        />
      </div>
      {expanded && (
        <div className="mt-0.5 mb-1 ml-11 flex max-h-56 flex-col gap-0.5 overflow-y-auto">
          {members.map((person) => (
            <TeamMemberRow
              key={person.id}
              project={project}
              person={person}
              teamRole={team.role}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TeamMemberRow({
  project,
  person,
  teamRole,
}: Readonly<{
  project: MockProject;
  person: OrgPerson;
  teamRole: ProjectRole;
}>) {
  const override = project.collaborators.find((c) => c.id === person.id);
  const isBlocked = override?.blocked ?? false;
  const value = override?.role ?? teamRole;
  const isCustom = isBlocked || value !== teamRole;

  function handleRoleChange(next: ProjectRole) {
    if (next === teamRole) {
      setTeamMemberOverride(project.id, person, null);
    } else {
      setTeamMemberOverride(project.id, person, { role: next });
    }
  }

  function handleBlock() {
    setTeamMemberOverride(project.id, person, {
      role: teamRole,
      blocked: true,
    });
  }

  function handleRestore() {
    setTeamMemberOverride(project.id, person, null);
  }

  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1">
      <Avatar className="size-6">
        <AvatarFallback className="text-[10px]">
          {person.initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            'truncate text-sm',
            isBlocked && 'text-muted-foreground line-through',
          )}
        >
          {person.name}
        </span>
        {isCustom && (
          <span className="text-xs text-muted-foreground">
            {isBlocked ? 'Kein Zugriff' : 'Angepasst'}
          </span>
        )}
      </div>
      {isBlocked ? (
        <Button variant="ghost" size="sm" onClick={handleRestore}>
          <RotateCcw />
          Zugriff geben
        </Button>
      ) : (
        <RoleSelect
          value={value}
          onChange={handleRoleChange}
          onRemove={handleBlock}
          removeLabel="Zugriff entziehen"
          triggerClassName="h-8 w-40 shrink-0"
        />
      )}
    </div>
  );
}
