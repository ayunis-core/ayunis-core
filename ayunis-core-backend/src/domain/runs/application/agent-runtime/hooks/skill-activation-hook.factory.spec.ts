import type { UUID } from 'crypto';
import type { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import type { ToolAssemblyService } from '../../services/tool-assembly.service';
import type { BackendToolAdapter } from '../backend-tool.adapter';
import { RuntimeToolIntegrationRegistry } from '../runtime-tool-integration.registry';
import { SkillActivationHookFactory } from './skill-activation-hook.factory';

const threadId = '123e4567-e89b-12d3-a456-426614174000' as UUID;

function buildHook(
  overrides: { rebuiltTools?: unknown[]; activatedSkillName?: string } = {},
) {
  const findThreadUseCase = {
    execute: jest.fn().mockResolvedValue({ thread: { id: threadId } }),
  } as unknown as FindThreadUseCase;
  const buildRunContext = jest.fn().mockResolvedValue({
    tools: [{ name: 'source_query' }],
    instructions: 'Use the newly activated sources.',
  });
  const toolAssemblyService = {
    buildRunContext,
  } as unknown as ToolAssemblyService;
  const toRuntimeTools = jest
    .fn()
    .mockReturnValue(overrides.rebuiltTools ?? [{ name: 'source_query' }]);
  const backendToolAdapter = {
    toRuntimeTools,
  } as unknown as BackendToolAdapter;

  const factory = new SkillActivationHookFactory(
    findThreadUseCase,
    toolAssemblyService,
    backendToolAdapter,
  );
  const hookParams = {
    threadId,
    activeSkills: [],
    canUseTools: true,
    isAnonymous: false,
    modelInternetAccessEnabled: false,
    integrations: new RuntimeToolIntegrationRegistry([]),
    activatedSkillName: overrides.activatedSkillName,
  };
  const hook = factory.create(hookParams);
  return { hook, buildRunContext, toRuntimeTools };
}

function toolCtx(name: string, isError = false) {
  return {
    iteration: 0,
    toolCall: { id: 'c1', name, input: {} },
    result: 'ok',
    isError,
    setTools: jest.fn(),
    setInstructions: jest.fn(),
  };
}

describe('SkillActivationHookFactory', () => {
  it('rebuilds and swaps in the tool set after activate_skill', async () => {
    const { hook, buildRunContext } = buildHook();
    const ctx = toolCtx('activate_skill');

    await hook.afterToolCall!(ctx as never);

    expect(buildRunContext).toHaveBeenCalledWith(
      { id: threadId },
      [],
      true,
      false,
      false,
    );
    expect(ctx.setTools).toHaveBeenCalledWith([{ name: 'source_query' }]);
    expect(ctx.setInstructions).toHaveBeenCalledWith(
      'Use the newly activated sources.',
    );
  });

  it('ignores other tool calls', async () => {
    const { hook, buildRunContext } = buildHook();
    const ctx = toolCtx('get_weather');

    await hook.afterToolCall!(ctx as never);

    expect(buildRunContext).not.toHaveBeenCalled();
    expect(ctx.setTools).not.toHaveBeenCalled();
  });

  it('ignores a failed activate_skill call', async () => {
    const { hook } = buildHook();
    const ctx = toolCtx('activate_skill', true);

    await hook.afterToolCall!(ctx as never);

    expect(ctx.setTools).not.toHaveBeenCalled();
  });

  it('preserves the quick-action skill note after a later activation', async () => {
    const { hook } = buildHook({ activatedSkillName: 'Legal Research' });
    const ctx = toolCtx('activate_skill');

    await hook.afterToolCall!(ctx as never);

    expect(ctx.setInstructions).toHaveBeenCalledWith(
      expect.stringContaining(
        'Skill "Legal Research" has already been activated on this thread.',
      ),
    );
  });
});
