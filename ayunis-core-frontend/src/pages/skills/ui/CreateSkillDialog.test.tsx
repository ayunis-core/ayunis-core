import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CreateSkillDialog from './CreateSkillDialog';

interface CapturedProps {
  description?: string;
  ownerField?: ReactNode;
  onCreate: (data: object) => Promise<unknown>;
  onOpenChange?: (open: boolean) => void;
}

const mocks = vi.hoisted(() => ({
  createSkill: vi.fn(),
  dialogProps: null as CapturedProps | null,
  owner: {
    options: [] as { type: string; teamId?: string; teamName?: string }[],
    isLoading: false,
    selected: undefined as { type: string } | undefined,
    orgEditorsIncludeNonAdmins: false,
    select: vi.fn(),
    reset: vi.fn(),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/features/marketplace', () => ({
  useSkillMarketplaceUrl: () => null,
}));
vi.mock('@/pages/skills/api/useCreateSkill', () => ({
  useCreateSkill: () => ({ createSkill: mocks.createSkill }),
}));
vi.mock('@/features/resource-ownership', () => ({
  useOwnerSelection: () => mocks.owner,
  useOwnershipCopy: () => ({
    optionHint: (option: { type: string }) => `hint:${option.type}`,
  }),
  OwnerField: () => <div data-testid="owner-field" />,
}));
vi.mock('@/widgets/resource-create-dialog', () => ({
  SkillCreateDialog: (props: CapturedProps) => {
    mocks.dialogProps = props;
    return <div data-testid="skill-create-dialog">{props.ownerField}</div>;
  },
}));

function withOptions(options: { type: string; teamId?: string }[]) {
  mocks.owner.options = options;
  mocks.owner.selected = options.at(0);
}

describe('CreateSkillDialog', () => {
  beforeEach(() => {
    mocks.dialogProps = null;
    mocks.createSkill.mockReset();
    mocks.owner.reset.mockReset();
  });
  afterEach(cleanup);

  it('renders nothing when the caller may not create for any owner', () => {
    withOptions([]);

    render(<CreateSkillDialog />);

    expect(screen.queryByTestId('skill-create-dialog')).toBeNull();
  });

  it('keeps the default description when only the caller can own it', () => {
    withOptions([{ type: 'personal' }]);

    render(<CreateSkillDialog />);

    expect(mocks.dialogProps?.description).toBeUndefined();
    expect(screen.queryByTestId('owner-field')).toBeNull();
  });

  it('explains the only owner instead of offering a choice', () => {
    withOptions([{ type: 'team', teamId: 'team-1' }]);

    render(<CreateSkillDialog />);

    expect(mocks.dialogProps?.description).toBe('hint:team');
    expect(screen.queryByTestId('owner-field')).toBeNull();
  });

  it('offers the owner field and creates for the selected owner', async () => {
    withOptions([{ type: 'personal' }, { type: 'org' }]);
    mocks.owner.selected = { type: 'org' };

    render(<CreateSkillDialog />);
    await mocks.dialogProps?.onCreate({ name: 'Bauantrag' });

    expect(screen.getByTestId('owner-field')).toBeTruthy();
    expect(mocks.createSkill).toHaveBeenCalledWith({
      name: 'Bauantrag',
      owner: { type: 'org' },
    });
  });

  it('starts with the default owner again when the menu reopens it', () => {
    withOptions([{ type: 'personal' }, { type: 'org' }]);

    const { rerender } = render(<CreateSkillDialog open={false} />);
    rerender(<CreateSkillDialog open />);
    rerender(<CreateSkillDialog open={false} />);
    rerender(<CreateSkillDialog open />);

    expect(mocks.owner.reset).toHaveBeenCalledTimes(2);
  });

  it('starts with the default owner again when its own button opens it', () => {
    withOptions([{ type: 'personal' }, { type: 'org' }]);

    render(<CreateSkillDialog />);
    mocks.dialogProps?.onOpenChange?.(true);

    expect(mocks.owner.reset).toHaveBeenCalledTimes(1);
  });
});
