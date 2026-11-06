import type { Tool } from 'src/domain/tools/domain/tool.entity';
import type { ArtifactToolAssemblerService } from 'src/domain/runs/application/services/artifact-tool-assembler.service';
import { PromptSlot } from 'src/domain/runs/application/run-capabilities/run-capability';
import {
  aCapabilityContext,
  sectionsIn,
} from 'src/domain/runs/testing/run-capability.fixture';
import { ArtifactsCapability } from './artifacts.capability';

describe('ArtifactsCapability', () => {
  const artifactTools = [{ name: 'create_document' }] as Tool[];
  const assembleArtifactTools = jest.fn().mockResolvedValue(artifactTools);
  const capability = new ArtifactsCapability({
    assembleArtifactTools,
  } as unknown as ArtifactToolAssemblerService);

  beforeEach(() => assembleArtifactTools.mockClear());

  it("offers the thread's artifact tools", async () => {
    const context = aCapabilityContext();

    const contribution = await capability.contribute(context);

    expect(contribution.tools).toBe(artifactTools);
    expect(assembleArtifactTools).toHaveBeenCalledWith(context.thread);
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
