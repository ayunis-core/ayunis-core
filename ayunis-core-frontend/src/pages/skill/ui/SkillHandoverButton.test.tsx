import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSkillMcpIntegrationsControllerListSkillMcpIntegrations } from '@/shared/api/generated/ayunisCoreAPI';
import type { SkillResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { SkillHandoverButton } from './SkillHandoverButton';

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  useSkillMcpIntegrationsControllerListSkillMcpIntegrations: vi.fn(),
}));

vi.mock('@/features/resource-handover', () => ({
  HandoverButton: ({ unlinksResources }: { unlinksResources: boolean }) => (
    <div data-testid="handover-button">{String(unlinksResources)}</div>
  ),
}));

const integrations = vi.mocked(
  useSkillMcpIntegrationsControllerListSkillMcpIntegrations,
);

function answer(state: { data?: unknown[]; isLoading?: boolean }) {
  integrations.mockReturnValue({
    data: state.data,
    isLoading: state.isLoading ?? false,
  } as never);
}

const skill = { id: 'skill-1', name: 'Protokoll' } as SkillResponseDto;

afterEach(cleanup);

describe('SkillHandoverButton', () => {
  it('waits until the integrations are known', () => {
    answer({ isLoading: true });
    render(<SkillHandoverButton skill={skill} />);

    expect(screen.queryByTestId('handover-button')).toBeNull();
  });

  it('warns about unlinking when the skill has integrations', () => {
    answer({ data: [{ id: 'mcp-1' }] });
    render(<SkillHandoverButton skill={skill} />);

    expect(screen.getByTestId('handover-button').textContent).toBe('true');
  });

  it('does not warn without integrations', () => {
    answer({ data: [] });
    render(<SkillHandoverButton skill={skill} />);

    expect(screen.getByTestId('handover-button').textContent).toBe('false');
  });

  it('warns when the integrations could not be loaded', () => {
    answer({});
    render(<SkillHandoverButton skill={skill} />);

    expect(screen.getByTestId('handover-button').textContent).toBe('true');
  });
});
