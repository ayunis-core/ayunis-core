import { PromptSlot } from 'src/domain/runs/application/run-capabilities/run-capability';
import {
  aCapabilityContext,
  createAssembleToolUseCase,
  sectionsIn,
  toolNames,
} from 'src/domain/runs/testing/run-capability.fixture';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { ClientContextCapability } from './client-context.capability';

describe('ClientContextCapability', () => {
  const capability = new ClientContextCapability(createAssembleToolUseCase());

  it('offers the five Outlook tools and the Outlook context to an Outlook session', async () => {
    const contribution = await capability.contribute(
      aCapabilityContext({ client: 'outlook' }),
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

  it('adds nothing to a browser session', async () => {
    expect(
      await capability.contribute(aCapabilityContext({ client: null })),
    ).toEqual({});
  });

  it('adds nothing when the model cannot use tools, since the context only describes the tools', async () => {
    expect(
      await capability.contribute(
        aCapabilityContext({ client: 'outlook', canUseTools: false }),
      ),
    ).toEqual({});
  });
});
