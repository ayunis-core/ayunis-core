import { PromptSlot } from 'src/domain/runs/application/run-capabilities/run-capability';
import {
  aCapabilityContext,
  createAssembleToolUseCase,
  sectionsIn,
  toolNames,
} from 'src/domain/runs/testing/run-capability.fixture';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { OutlookAddInCapability } from './outlook-add-in.capability';

describe('OutlookAddInCapability', () => {
  const capability = new OutlookAddInCapability(createAssembleToolUseCase());

  it('offers the five Outlook tools and the Outlook context', async () => {
    const contribution = await capability.contribute(
      aCapabilityContext({ profile: { id: 'outlook' } }),
    );

    expect(toolNames(contribution)).toEqual([
      ToolType.OUTLOOK_READ_EMAIL,
      ToolType.OUTLOOK_READ_ATTACHMENT,
      ToolType.OUTLOOK_DRAFT_EMAIL,
      ToolType.OUTLOOK_MOVE_EMAIL_TO_COMPOSER,
      ToolType.OUTLOOK_SAVE_EMAIL_TO_DRAFT,
    ]);
    expect(sectionsIn(contribution, PromptSlot.POLICIES)).toEqual([
      expect.stringContaining('<outlook_context>'),
    ]);
  });

  it('adds nothing when the model cannot use tools, since the context only describes the tools', async () => {
    expect(
      await capability.contribute(
        aCapabilityContext({ profile: { id: 'outlook' }, canUseTools: false }),
      ),
    ).toEqual({});
  });
});
