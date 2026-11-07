import { randomUUID } from 'crypto';
import { RunInvalidInputError } from 'src/domain/runs/application/runs.errors';
import { PromptSlot } from 'src/domain/runs/application/run-capabilities/run-capability';
import {
  aCapabilityContext,
  aThread,
  createAssembleToolUseCase,
  toolNames,
} from 'src/domain/runs/testing/run-capability.fixture';
import type { SendNotificationTool } from 'src/domain/tools/domain/tools/send-notification-tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { NotificationsCapability } from './notifications.capability';

describe('NotificationsCapability', () => {
  const routineId = randomUUID();
  const routineContext = aCapabilityContext({
    profile: {
      id: 'routine',
      routine: { name: 'Verkündungsplattform', internetEnabled: true },
    },
    thread: aThread({ routineId }),
  });

  function capability(routinesEnabled: boolean) {
    return new NotificationsCapability(createAssembleToolUseCase(), {
      get: () => routinesEnabled,
    } as never);
  }

  it('offers send_notification for the routine the run belongs to', async () => {
    const contribution = await capability(true).contribute(routineContext);

    expect(toolNames(contribution)).toEqual([ToolType.SEND_NOTIFICATION]);
    const [tool] = contribution.tools ?? [];
    expect((tool as SendNotificationTool).origin.routineId).toBe(routineId);
  });

  it('adds no prompt text beyond the tool description', async () => {
    const contribution = await capability(true).contribute(routineContext);

    expect(
      (contribution.sections ?? []).filter(
        (section) => section.slot !== PromptSlot.TOOL_USAGE,
      ),
    ).toEqual([]);
  });

  it('offers nothing with the routines feature turned off', async () => {
    const contribution = await capability(false).contribute(routineContext);

    expect(toolNames(contribution)).toEqual([]);
  });

  it('only runs in a routine run', async () => {
    await expect(
      Promise.resolve().then(() =>
        capability(true).contribute(aCapabilityContext()),
      ),
    ).rejects.toBeInstanceOf(RunInvalidInputError);
  });
});
