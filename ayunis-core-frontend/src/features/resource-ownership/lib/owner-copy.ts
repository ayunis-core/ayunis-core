import type {
  OwnerChoice,
  OwnerEditor,
  OwnerOption,
} from '@/features/resource-ownership/model/types';

export interface CopyKey {
  key: string;
  values?: Record<string, string | number>;
}

export function teamEditorsCopy(
  editors: readonly OwnerEditor[],
  myUserId: string | undefined,
): CopyKey {
  if (editors.some(({ userId }) => userId === myUserId)) {
    return {
      key: editors.length > 1 ? 'editors.youAndOthers' : 'editors.youOnly',
    };
  }
  if (editors.length === 1) {
    return { key: 'editors.one', values: { name: editors[0].name } };
  }
  return {
    key: editors.length > 1 ? 'editors.teamAdmins' : 'editors.adminsOnly',
  };
}

export function orgEditorsCopy(includeNonAdmins: boolean): CopyKey {
  return {
    key: includeNonAdmins ? 'editors.orgWithRight' : 'editors.adminsOnly',
  };
}

export function ownerOptionValue(option: OwnerOption): string {
  return option.type === 'team' ? `team:${option.teamId}` : option.type;
}

export function toOwnerChoice(option: OwnerOption): OwnerChoice {
  if (option.type === 'team' && option.teamId) {
    return { ownerType: 'team', teamId: option.teamId };
  }
  return option.type === 'org'
    ? { ownerType: 'org' }
    : { ownerType: 'personal' };
}
