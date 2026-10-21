import type {
  CopyKey,
  HandoverPerson,
  HandoverTarget,
  HandoverTargetRef,
} from '@/features/resource-handover/model/types';

export function targetValue(target: HandoverTargetRef): string {
  return target.type === 'team' ? `team:${target.teamId}` : 'org';
}

export function targetCopy(
  form: 'option' | 'to' | 'owner',
  target: HandoverTargetRef,
): CopyKey {
  return target.type === 'team'
    ? { key: `target.${form}.team`, values: { team: target.teamName ?? '' } }
    : { key: `target.${form}.org` };
}

export function dialogDescription(target: HandoverTarget): CopyKey {
  if (target.appliesImmediately) return { key: 'dialog.description.direct' };
  if (target.type === 'org' || target.reviewers.length === 0) {
    return { key: 'dialog.description.admin' };
  }
  return target.reviewers.length === 1
    ? {
        key: 'dialog.description.oneReviewer',
        values: { name: target.reviewers[0].name },
      }
    : { key: 'dialog.description.teamAdmins' };
}

function editSentence(
  target: HandoverTarget,
  orgEditorsIncludeNonAdmins: boolean,
): CopyKey {
  if (target.appliesImmediately) {
    return target.type === 'team'
      ? {
          key: 'dialog.hint.directTeam',
          values: { team: target.teamName ?? '' },
        }
      : { key: 'dialog.hint.directOrg' };
  }
  if (target.type === 'team') return { key: 'dialog.hint.requestTeam' };
  return {
    key: orgEditorsIncludeNonAdmins
      ? 'dialog.hint.requestOrgWithRight'
      : 'dialog.hint.requestOrg',
  };
}

export interface DialogHintOptions {
  targets: readonly HandoverTarget[];
  orgEditorsIncludeNonAdmins: boolean;
  unlinksResources: boolean;
}

export function dialogHint(
  target: HandoverTarget,
  options: DialogHintOptions,
): CopyKey[] {
  const sentences: CopyKey[] = [
    editSentence(target, options.orgEditorsIncludeNonAdmins),
    {
      key:
        target.type === 'team'
          ? 'dialog.hint.audienceTeam'
          : 'dialog.hint.audienceOrg',
      values: { count: target.memberCount },
    },
  ];
  const teamCount = options.targets.filter(({ type }) => type === 'team');
  if (target.type === 'team' && teamCount.length > 1) {
    sentences.push({ key: 'dialog.hint.severalTeams' });
  }
  if (options.unlinksResources) sentences.push({ key: 'dialog.hint.unlinks' });
  return sentences;
}

export function reviewerCopy(
  target: HandoverTargetRef,
  reviewers: readonly HandoverPerson[],
): CopyKey {
  if (target.type === 'org' || reviewers.length === 0) {
    return { key: 'status.admin' };
  }
  return reviewers.length === 1
    ? { key: 'status.person', values: { name: reviewers[0].name } }
    : { key: 'status.teamAdmin' };
}

export interface TargetGroups {
  own: HandoverTarget[];
  other: HandoverTarget[];
  org: HandoverTarget[];
}

export function groupTargets(targets: readonly HandoverTarget[]): TargetGroups {
  const byName = (left: HandoverTarget, right: HandoverTarget) =>
    (left.teamName ?? '').localeCompare(right.teamName ?? '');
  const teams = targets.filter(({ type }) => type === 'team').sort(byName);
  return {
    own: teams.filter(({ isOwnTeam }) => isOwnTeam),
    other: teams.filter(({ isOwnTeam }) => !isOwnTeam),
    org: targets.filter(({ type }) => type === 'org'),
  };
}

export function orderedTargets(groups: TargetGroups): HandoverTarget[] {
  return [...groups.own, ...groups.other, ...groups.org];
}
