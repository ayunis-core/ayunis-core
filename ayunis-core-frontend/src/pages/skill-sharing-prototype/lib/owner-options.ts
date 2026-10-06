import {
  adminTeamIds,
  findTeam,
  orgManageKey,
  orgMemberCount,
  teamManageKey,
} from '@/widgets/sharing-prototype/model/access';
import {
  nonAdminsMay,
  roleMay,
  teamAdminMay,
} from '@/widgets/sharing-prototype/model/prototype-store';
import type {
  Person,
  ResourceKind,
  Role,
  SkillOwner,
} from '@/widgets/sharing-prototype/model/types';

export interface OwnerOption {
  value: string;
  label: string;
  owner: SkillOwner;
  hint: string;
}

export function orgEditorsSentence(resource: ResourceKind): string {
  return nonAdminsMay(orgManageKey(resource))
    ? 'Ändern können Admins und alle mit dem Recht dazu.'
    : 'Ändern können Admins.';
}

function orgOwnerOption(resource: ResourceKind): OwnerOption {
  return {
    value: 'org',
    label: 'Organisation',
    owner: { kind: 'org' },
    hint: `Alle ${orgMemberCount()} Personen in der Organisation können sie nutzen. ${orgEditorsSentence(resource)}`,
  };
}

function teamOption(teamId: string): OwnerOption {
  const team = findTeam(teamId);
  return {
    value: `team-${team.id}`,
    label: `Team ${team.name}`,
    owner: { kind: 'team', teamId: team.id },
    hint: `Alle im Team ${team.name} können sie nutzen. Ändern können Sie und die anderen Team-Admins.`,
  };
}

export function ownerOptionsFor(
  person: Person,
  role: Role,
  resource: ResourceKind = 'skill',
): OwnerOption[] {
  const teamIds = teamAdminMay(teamManageKey(resource))
    ? adminTeamIds(person)
    : [];
  const options: OwnerOption[] = [
    {
      value: 'self',
      label: 'Ihnen',
      owner: { kind: 'user', userId: person.id },
      hint: 'Nur Sie können sie nutzen und ändern.',
    },
    ...teamIds.map(teamOption),
  ];
  return roleMay(role, orgManageKey(resource))
    ? [...options, orgOwnerOption(resource)]
    : options;
}

export function createdMessage(name: string, owner: SkillOwner): string {
  if (owner.kind === 'org') {
    return `„${name}“ gehört jetzt der Organisation. Alle können sie nutzen.`;
  }
  if (owner.kind === 'team') {
    return `„${name}“ gehört jetzt Team ${findTeam(owner.teamId).name}.`;
  }
  return `„${name}“ wurde erstellt.`;
}
