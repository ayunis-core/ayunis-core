import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import {
  aCapabilityContext,
  createAssembleToolUseCase,
  toolNames,
} from 'src/domain/runs/testing/run-capability.fixture';
import { EmailCalendarCapability } from './email-calendar.capability';

describe('EmailCalendarCapability', () => {
  const capability = new EmailCalendarCapability(createAssembleToolUseCase());

  it('offers the email and calendar widgets', async () => {
    expect(
      toolNames(await capability.contribute(aCapabilityContext())),
    ).toEqual([ToolType.SEND_EMAIL, ToolType.CREATE_CALENDAR_EVENT]);
  });

  it('offers nothing when the model cannot use tools', async () => {
    expect(
      await capability.contribute(aCapabilityContext({ canUseTools: false })),
    ).toEqual({});
  });
});
