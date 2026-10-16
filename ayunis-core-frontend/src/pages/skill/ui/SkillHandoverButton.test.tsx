import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  useSkillKnowledgeBasesControllerListSkillKnowledgeBases,
  useSkillMcpIntegrationsControllerListSkillMcpIntegrations,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { SkillResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { SkillHandoverButton } from './SkillHandoverButton';

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  useSkillKnowledgeBasesControllerListSkillKnowledgeBases: vi.fn(),
  useSkillMcpIntegrationsControllerListSkillMcpIntegrations: vi.fn(),
}));

vi.mock('@/features/resource-handover', () => ({
  HandoverButton: ({ unlinksResources }: { unlinksResources: boolean }) => (
    <div data-testid="handover-button">{String(unlinksResources)}</div>
  ),
}));

const knowledgeBases = vi.mocked(
  useSkillKnowledgeBasesControllerListSkillKnowledgeBases,
);
const integrations = vi.mocked(
  useSkillMcpIntegrationsControllerListSkillMcpIntegrations,
);

function answer(
  hook: typeof knowledgeBases | typeof integrations,
  state: { data?: unknown[]; isLoading?: boolean },
) {
  hook.mockReturnValue({
    data: state.data,
    isLoading: state.isLoading ?? false,
  } as never);
}

const skill = { id: 'skill-1', name: 'Protokoll' } as SkillResponseDto;

afterEach(cleanup);

describe('SkillHandoverButton', () => {
  it('waits until the links are known', () => {
    answer(knowledgeBases, { isLoading: true });
    answer(integrations, { data: [] });
    render(<SkillHandoverButton skill={skill} />);

    expect(screen.queryByTestId('handover-button')).toBeNull();
  });

  it('warns about unlinking when the skill has links', () => {
    answer(knowledgeBases, { data: [] });
    answer(integrations, { data: [{ id: 'mcp-1' }] });
    render(<SkillHandoverButton skill={skill} />);

    expect(screen.getByTestId('handover-button').textContent).toBe('true');
  });

  it('does not warn without links', () => {
    answer(knowledgeBases, { data: [] });
    answer(integrations, { data: [] });
    render(<SkillHandoverButton skill={skill} />);

    expect(screen.getByTestId('handover-button').textContent).toBe('false');
  });

  it('warns when the links could not be loaded', () => {
    answer(knowledgeBases, {});
    answer(integrations, { data: [] });
    render(<SkillHandoverButton skill={skill} />);

    expect(screen.getByTestId('handover-button').textContent).toBe('true');
  });
});
