import {
  allPeople,
  allTeams,
  findPerson,
  findTeam,
  teamMemberCount,
  teamMembers,
} from '@/widgets/sharing-prototype/model/access';
import type { Person } from '@/widgets/sharing-prototype/model/types';

export interface ShareOption {
  value: string;
  kind: 'person' | 'team' | 'org';
  label: string;
  group: string;
  detail?: string;
}

export interface ShareOptionGroup {
  value: string;
  items: ShareOption[];
}

const NO_TEAM = 'Ohne Team';
const TEAMS_GROUP = 'Teams';
const ORG_GROUP = 'Organisation';

function primaryTeamName(person: Person): string {
  const [teamId] = person.teamIds;
  return teamId ? findTeam(teamId).name : NO_TEAM;
}

export function affiliationOf(person: Person): string {
  return person.department || primaryTeamName(person);
}

export function isSameOption(a: ShareOption, b: ShareOption): boolean {
  return a.kind === b.kind && a.value === b.value;
}

export function hasOrgOption(options: ShareOption[]): boolean {
  return options.some((option) => option.kind === 'org');
}

export function peopleCoveredBy(options: ShareOption[]): string[] {
  if (hasOrgOption(options)) return allPeople().map((person) => person.id);
  return options
    .filter((option) => option.kind === 'team')
    .flatMap((option) => teamMembers(option.value).map((person) => person.id));
}

export function withoutCoveredPeople(options: ShareOption[]): ShareOption[] {
  if (hasOrgOption(options)) {
    return options.filter((option) => option.kind === 'org');
  }
  const covered = peopleCoveredBy(options);
  return options.filter(
    (option) => option.kind === 'team' || !covered.includes(option.value),
  );
}

function orgOption(): ShareOption {
  return {
    value: 'org',
    kind: 'org',
    label: 'Gesamte Organisation',
    group: ORG_GROUP,
    detail: `${allPeople().length} Personen`,
  };
}

function teamOptions(excludedTeamIds: string[]): ShareOption[] {
  return allTeams()
    .filter((team) => !excludedTeamIds.includes(team.id))
    .map((team) => ({
      value: team.id,
      kind: 'team',
      label: `Team ${team.name}`,
      group: TEAMS_GROUP,
      detail: `${teamMemberCount(team.id)} Personen`,
    }));
}

function personOptions(excludedPersonIds: string[]): ShareOption[] {
  return allPeople()
    .filter((person) => !excludedPersonIds.includes(person.id))
    .map((person) => ({
      value: person.id,
      kind: 'person' as const,
      label: person.name,
      group: primaryTeamName(person),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function isInScope(option: ShareOption, scopeTeamIds?: string[]): boolean {
  if (!scopeTeamIds || option.kind === 'org') return true;
  if (option.kind === 'team') return scopeTeamIds.includes(option.value);
  return findPerson(option.value).teamIds.some((teamId) =>
    scopeTeamIds.includes(teamId),
  );
}

export function shareOptionGroups(
  excludedPersonIds: string[],
  excludedTeamIds: string[],
  scopeTeamIds?: string[],
  includeOrg = false,
): ShareOptionGroup[] {
  const options = [
    ...(includeOrg ? [orgOption()] : []),
    ...teamOptions(excludedTeamIds),
    ...personOptions(excludedPersonIds),
  ].filter((option) => isInScope(option, scopeTeamIds));
  const groupNames = [
    ORG_GROUP,
    TEAMS_GROUP,
    ...allTeams().map((team) => team.name),
    NO_TEAM,
  ];
  return groupNames
    .map((name) => ({
      value: name,
      items: options.filter((option) => option.group === name),
    }))
    .filter((group) => group.items.length > 0);
}

export function filterOptionGroups(
  groups: ShareOptionGroup[],
  query: string,
): ShareOptionGroup[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return groups;
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((option) =>
        `${option.label} ${option.group}`.toLowerCase().includes(needle),
      ),
    }))
    .filter((group) => group.items.length > 0);
}
