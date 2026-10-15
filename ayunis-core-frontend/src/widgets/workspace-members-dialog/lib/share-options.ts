import type { ShareCandidatesResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface Grouped {
  group: string;
  groupKey: string;
}

export type ShareOption = Grouped &
  (
    | {
        kind: 'organization';
        value: 'organization';
        label: string;
        detail: string;
      }
    | {
        kind: 'team';
        value: string;
        label: string;
        detail: string;
        memberIds: string[];
      }
    | { kind: 'person'; value: string; label: string }
  );

export interface ShareOptionGroup {
  value: string;
  label: string;
  items: ShareOption[];
}

const ORGANIZATION_GROUP = 'organization';
const TEAMS_GROUP = 'teams';
const NO_TEAM_GROUP = 'no-team';

export interface ShareOptionCopy {
  organizationGroup: string;
  teamsGroup: string;
  noTeamGroup: string;
  organization: string;
  team: (name: string) => string;
  people: (count: number) => string;
}

export function isSameOption(a: ShareOption, b: ShareOption): boolean {
  return a.kind === b.kind && a.value === b.value;
}

export function hasOrganization(options: ShareOption[]): boolean {
  return options.some(({ kind }) => kind === 'organization');
}

function coveredPeople(options: ShareOption[]): Set<string> {
  return new Set(
    options.flatMap((option) =>
      option.kind === 'team' ? option.memberIds : [],
    ),
  );
}

export function withoutCoveredPeople(options: ShareOption[]): ShareOption[] {
  if (hasOrganization(options)) {
    return options.filter(({ kind }) => kind === 'organization');
  }
  const covered = coveredPeople(options);
  return options.filter(
    (option) => option.kind !== 'person' || !covered.has(option.value),
  );
}

function allOptions(
  candidates: ShareCandidatesResponseDto,
  copy: ShareOptionCopy,
): ShareOption[] {
  return [
    ...(candidates.organization
      ? [
          {
            kind: 'organization' as const,
            value: 'organization' as const,
            label: copy.organization,
            detail: copy.people(candidates.organization.memberCount),
            group: copy.organizationGroup,
            groupKey: ORGANIZATION_GROUP,
          },
        ]
      : []),
    ...candidates.teams.map((team) => ({
      kind: 'team' as const,
      value: team.teamId,
      label: copy.team(team.name),
      detail: copy.people(team.memberCount),
      group: copy.teamsGroup,
      groupKey: TEAMS_GROUP,
      memberIds: team.memberIds,
    })),
    ...candidates.people
      .map((person) => ({
        kind: 'person' as const,
        value: person.userId,
        label: person.name,
        group: person.primaryTeam?.name ?? copy.noTeamGroup,
        groupKey: person.primaryTeam
          ? `team:${person.primaryTeam.id}`
          : NO_TEAM_GROUP,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  ];
}

export function shareOptionGroups(
  candidates: ShareCandidatesResponseDto,
  selected: ShareOption[],
  copy: ShareOptionCopy,
): ShareOptionGroup[] {
  const covered = coveredPeople(selected);
  const options = hasOrganization(selected)
    ? []
    : allOptions(candidates, copy).filter(
        (option) => option.kind !== 'person' || !covered.has(option.value),
      );
  const teamGroups = new Map(
    options
      .filter(
        ({ kind, groupKey }) => kind === 'person' && groupKey !== NO_TEAM_GROUP,
      )
      .map(({ groupKey, group }) => [groupKey, group]),
  );
  const personGroupKeys = [...teamGroups]
    .sort(([, a], [, b]) => a.localeCompare(b))
    .map(([groupKey]) => groupKey);
  return [ORGANIZATION_GROUP, TEAMS_GROUP, ...personGroupKeys, NO_TEAM_GROUP]
    .map((value) => {
      const items = options.filter((option) => option.groupKey === value);
      return { value, label: items.at(0)?.group ?? '', items };
    })
    .filter(({ items }) => items.length > 0);
}

export function filterOptionGroups(
  groups: ShareOptionGroup[],
  query: string,
): ShareOptionGroup[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return groups;
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((option) =>
        `${option.label} ${option.group}`.toLocaleLowerCase().includes(needle),
      ),
    }))
    .filter(({ items }) => items.length > 0);
}
