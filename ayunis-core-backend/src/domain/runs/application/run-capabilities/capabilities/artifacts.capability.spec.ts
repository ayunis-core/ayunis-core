import type { Tool } from 'src/domain/tools/domain/tool.entity';
import type { ArtifactToolAssemblerService } from 'src/domain/runs/application/services/artifact-tool-assembler.service';
import { PromptSlot } from 'src/domain/runs/application/run-capabilities/run-capability';
import {
  aCapabilityContext,
  sectionsIn,
} from 'src/domain/runs/testing/run-capability.fixture';
import { ArtifactsCapability } from './artifacts.capability';
import type { RunStartContext } from '@ayunis/agent-runtime';
import type { RunProfileHandle } from 'src/domain/runs/application/run-capabilities/run-capability';
import { THREAD_PII_MASKS_EVENT } from 'src/domain/runs/application/agent-runtime/masks-event';
import { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';

describe('ArtifactsCapability', () => {
  const artifactTools = [{ name: 'create_document' }] as Tool[];
  const assembleArtifactTools = jest
    .fn()
    .mockResolvedValue({ tools: artifactTools, threadPiiMasks: null });
  const capability = new ArtifactsCapability({
    assembleArtifactTools,
  } as unknown as ArtifactToolAssemblerService);

  beforeEach(() => assembleArtifactTools.mockClear());

  it('streams the chat masks allocated for listed artifact titles when the run starts', async () => {
    const masks = [
      new ThreadPiiMask({
        threadId: '423e4567-e89b-12d3-a456-426614174000',
        category: PiiCategory.PERSON_NAME,
        maskIndex: 3,
        value: 'Anna Schmidt',
      }),
    ];
    assembleArtifactTools.mockResolvedValueOnce({
      tools: artifactTools,
      threadPiiMasks: masks,
    });
    const contribution = await capability.contribute(
      aCapabilityContext({ isAnonymous: true }),
    );
    const emit = jest.fn();

    const [createHook] = contribution.hooks ?? [];
    await createHook({} as RunProfileHandle).runStart?.({
      emit,
    } as unknown as RunStartContext);

    expect(emit).toHaveBeenCalledWith({
      name: THREAD_PII_MASKS_EVENT,
      data: masks,
    });
  });

  it('adds no hook when listing allocated no chat masks', async () => {
    const contribution = await capability.contribute(aCapabilityContext());

    expect(contribution.hooks).toBeUndefined();
  });

  it("offers the thread's artifact tools for the run's mode", async () => {
    const context = aCapabilityContext({ isAnonymous: true });

    const contribution = await capability.contribute(context);

    expect(contribution.tools).toBe(artifactTools);
    expect(assembleArtifactTools).toHaveBeenCalledWith(context.thread, true);
  });

  it('explains when to create documents, diagrams and spreadsheets', async () => {
    const usage = sectionsIn(
      await capability.contribute(aCapabilityContext()),
      PromptSlot.TOOL_USAGE,
    ).join('\n');

    expect(usage).toContain('<document_usage>');
    expect(usage).toContain('Word/PDF');
    expect(usage).toContain('<diagram_usage>');
    expect(usage).toContain('<spreadsheet_usage>');
  });

  it('keeps the guidance but offers no tools when the model cannot use tools', async () => {
    const contribution = await capability.contribute(
      aCapabilityContext({ canUseTools: false }),
    );

    expect(contribution.tools).toBeUndefined();
    expect(sectionsIn(contribution, PromptSlot.TOOL_USAGE)).toHaveLength(3);
    expect(assembleArtifactTools).not.toHaveBeenCalled();
  });
});
