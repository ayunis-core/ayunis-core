import { describe, expect, it } from 'vitest';
import type { SkillResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { skillContentMode } from './skill-access';

function skill(
  ownerType: SkillResponseDto['ownerType'],
  canEdit?: boolean,
  canUse = canEdit,
): SkillResponseDto {
  return {
    id: 'skill-1',
    ownerType,
    viewer:
      canEdit === undefined
        ? undefined
        : { canUse: canUse ?? canEdit, canEdit, canDelete: canEdit },
    name: 'Bauanträge prüfen',
    shortDescription: 'Prüft Bauanträge',
    instructions: 'Prüfe den Antrag.',
    marketplaceIdentifier: null,
    isActive: true,
    createdAt: '2026-10-15T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z',
    isPinned: false,
    isMandatory: false,
  };
}

describe('skillContentMode', () => {
  it('lets the owner edit a personal skill and link resources', () => {
    expect(skillContentMode(skill('personal', true), false)).toEqual({
      isReadOnly: false,
      linksResources: true,
    });
  });

  it('shows someone else’s personal skill read-only without resource cards', () => {
    expect(skillContentMode(skill('personal', false), false)).toEqual({
      isReadOnly: true,
      linksResources: false,
    });
  });

  it('shows a personal skill under review read-only', () => {
    expect(skillContentMode(skill('personal', false), true)).toEqual({
      isReadOnly: true,
      linksResources: false,
    });
  });

  it('shows a team skill read-only to people who may not change it', () => {
    expect(skillContentMode(skill('team', false), false)).toEqual({
      isReadOnly: true,
      linksResources: false,
    });
  });

  it('keeps the editor for team editors but no resource links', () => {
    expect(skillContentMode(skill('team', true), false)).toEqual({
      isReadOnly: false,
      linksResources: false,
    });
  });

  it("keeps the owner's disabled editor and resource cards without the edit right", () => {
    expect(skillContentMode(skill('personal', false, true), false)).toEqual({
      isReadOnly: false,
      linksResources: true,
    });
  });
});
