import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { PromptSlot } from 'src/domain/runs/application/run-capabilities/run-capability';
import {
  aCapabilityContext,
  createAssembleToolUseCase,
  sectionsIn,
  toolNames,
} from 'src/domain/runs/testing/run-capability.fixture';
import { FilesChartsMapCapability } from './files-charts-map.capability';

describe('FilesChartsMapCapability', () => {
  const capability = new FilesChartsMapCapability(createAssembleToolUseCase());

  it('offers the file, chart and map widgets', async () => {
    expect(
      toolNames(await capability.contribute(aCapabilityContext())),
    ).toEqual([
      ToolType.CREATE_FILE,
      ToolType.BAR_CHART,
      ToolType.LINE_CHART,
      ToolType.PIE_CHART,
      ToolType.MAP,
    ]);
  });

  it('routes downloadable text files to create_file with complete content', async () => {
    const [usage] = sectionsIn(
      await capability.contribute(aCapabilityContext()),
      PromptSlot.TOOL_USAGE,
    );

    expect(usage).toContain(
      'Use create_file for downloadable CSV, XML, JSON and plain-text (TXT) files',
    );
    expect(usage).toContain(
      'Do not use create_document or markdown links for these files',
    );
    expect(usage).toContain('Include all individual rows');
    expect(usage).toContain('internal processing paths are not download links');
  });

  it('keeps the file guidance but offers no tools when the model cannot use tools', async () => {
    const contribution = await capability.contribute(
      aCapabilityContext({ canUseTools: false }),
    );

    expect(contribution.tools).toBeUndefined();
    expect(sectionsIn(contribution, PromptSlot.TOOL_USAGE)).toHaveLength(1);
  });
});
