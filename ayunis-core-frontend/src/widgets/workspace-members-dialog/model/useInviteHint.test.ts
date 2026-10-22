import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WorkspaceSharingResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useInviteHint } from './useInviteHint';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function aSharing(
  viewer: Partial<WorkspaceSharingResponseDto['viewer']>,
  isSharedWithOrganization = false,
): WorkspaceSharingResponseDto {
  return {
    isSharedWithOrganization,
    viewer: {
      accessLevel: 'full',
      canInvite: false,
      canShareWithOrganization: false,
      ...viewer,
    },
    inviters: { managers: true, teamAdmins: false },
  } as WorkspaceSharingResponseDto;
}

function hintFor(sharing: WorkspaceSharingResponseDto) {
  return renderHook(() => useInviteHint(sharing)).result.current;
}

describe('useInviteHint', () => {
  it('says nothing to people who may invite', () => {
    expect(hintFor(aSharing({ canInvite: true }))).toBeNull();
  });

  it('points members without full access to those who have it', () => {
    expect(hintFor(aSharing({ accessLevel: 'edit' }))).toBe(
      'dialog.noFullAccess',
    );
  });

  it('names who may invite when the viewer may not', () => {
    expect(hintFor(aSharing({}))).toBe('dialog.noRight');
  });

  it('limits the hint to people and teams when the organisation can still be added', () => {
    expect(hintFor(aSharing({ canShareWithOrganization: true }))).toBe(
      'dialog.noRightPeople',
    );
    expect(hintFor(aSharing({ canShareWithOrganization: true }, true))).toBe(
      'dialog.noRight',
    );
  });
});
