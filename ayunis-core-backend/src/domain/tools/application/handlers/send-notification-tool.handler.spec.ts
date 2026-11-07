import { randomUUID } from 'crypto';
import { createMockContextService } from 'src/common/context/testing/context.fixtures';
import {
  NotificationInvalidError,
  NotificationLimitReachedError,
} from 'src/domain/notifications/application/notifications.errors';
import {
  aNotification,
  TEST_ORG_ID,
  TEST_USER_ID,
} from 'src/domain/notifications/application/testing/notification.fixtures';
import type { CreateNotificationUseCase } from 'src/domain/notifications/application/use-cases/create-notification/create-notification.use-case';
import { NotificationType } from 'src/domain/notifications/domain/notification-type.enum';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import {
  SendNotificationOrigin,
  SendNotificationTool,
} from 'src/domain/tools/domain/tools/send-notification-tool.entity';
import { SendNotificationToolHandler } from './send-notification-tool.handler';

describe('SendNotificationToolHandler', () => {
  const routineId = randomUUID();
  const threadId = randomUUID();
  const tool = new SendNotificationTool(new SendNotificationOrigin(routineId));
  const context = { orgId: TEST_ORG_ID, threadId };
  const input = {
    headline: 'Neue Verordnung zur Grundsteuer',
    subheadline: 'GVBl. NRW vom 07.11.2026',
    body: 'Die [Verordnung](https://recht.nrw.de/gvbl/2026-11-07) ändert die Hebesätze.',
  };

  function setup() {
    const createNotification = {
      execute: jest.fn().mockResolvedValue(aNotification()),
    } as unknown as jest.Mocked<CreateNotificationUseCase>;
    const handler = new SendNotificationToolHandler(
      createNotification,
      createMockContextService(),
    );
    return { createNotification, handler };
  }

  it("posts the notification to the run owner's inbox with the routine thread as origin, at most 3 per run", async () => {
    const { createNotification, handler } = setup();

    await expect(handler.execute({ tool, input, context })).resolves.toMatch(
      /sent/i,
    );

    expect(createNotification.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: TEST_USER_ID,
        orgId: TEST_ORG_ID,
        type: NotificationType.ROUTINE,
        ...input,
        routineId,
        routineThreadId: threadId,
        limitPerRoutineThread: 3,
      }),
    );
  });

  it('tells the model to stop and finish once the run sent 3 notifications', async () => {
    const { createNotification, handler } = setup();
    createNotification.execute.mockRejectedValue(
      new NotificationLimitReachedError(3),
    );

    const call = handler.execute({ tool, input, context });

    await expect(call).rejects.toThrow(ToolExecutionFailedError);
    await expect(call).rejects.toMatchObject({
      exposeToLLM: true,
      message: expect.stringContaining('finish_routine'),
    });
  });

  it('lets the model correct invalid input without creating anything', async () => {
    const { createNotification, handler } = setup();

    await expect(
      handler.execute({ tool, input: { headline: 'Nur Titel' }, context }),
    ).rejects.toMatchObject({ exposeToLLM: true });
    expect(createNotification.execute).not.toHaveBeenCalled();
  });

  it('passes a rejected text back to the model', async () => {
    const { createNotification, handler } = setup();
    createNotification.execute.mockRejectedValue(
      new NotificationInvalidError('headline is empty'),
    );

    await expect(
      handler.execute({ tool, input, context }),
    ).rejects.toMatchObject({
      exposeToLLM: true,
      message: expect.stringContaining('headline is empty'),
    });
  });
});
