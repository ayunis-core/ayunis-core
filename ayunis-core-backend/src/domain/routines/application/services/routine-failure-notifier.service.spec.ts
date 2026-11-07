import type { UUID } from 'crypto';
import { NotificationType } from 'src/domain/notifications/domain/notification-type.enum';
import {
  aRoutine,
  TEST_ORG_ID,
  TEST_ROUTINE_ID,
  TEST_USER_ID,
} from 'src/domain/routines/application/testing/routine.fixtures';
import { RoutineFailureNotifier } from './routine-failure-notifier.service';

const THREAD_ID = '77777777-7777-4777-8777-777777777777' as UUID;

describe('RoutineFailureNotifier', () => {
  function setup(options: { routinesEnabled?: boolean } = {}) {
    const createNotification = { execute: jest.fn().mockResolvedValue({}) };
    const notifier = new RoutineFailureNotifier(
      createNotification as never,
      { get: () => options.routinesEnabled ?? true } as never,
      { frontend: { baseUrl: 'https://core.example.test' } } as never,
    );
    return { createNotification, notifier };
  }

  it("posts an error notification to the owner's inbox linking to the routine thread", async () => {
    const { createNotification, notifier } = setup();

    await notifier.notify({
      routine: aRoutine(),
      failureReason: 'timeout',
      paused: false,
      routineThreadId: THREAD_ID,
    });

    expect(createNotification.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: TEST_USER_ID,
        orgId: TEST_ORG_ID,
        type: NotificationType.ROUTINE_ERROR,
        headline: 'Routine „Verkündungsplattform“ fehlgeschlagen',
        routineId: TEST_ROUTINE_ID,
        routineThreadId: THREAD_ID,
      }),
    );
  });

  it('says the routine is paused and links to the routines page', async () => {
    const { createNotification, notifier } = setup();

    await notifier.notify({
      routine: aRoutine(),
      failureReason: 'timeout',
      paused: true,
      routineThreadId: null,
    });

    const [command] = createNotification.execute.mock.calls[0] as [
      { headline: string; body: string; routineThreadId: UUID | null },
    ];
    expect(command.headline).toBe('Routine „Verkündungsplattform“ pausiert');
    expect(command.body).toContain(
      '[Routinen](https://core.example.test/routines)',
    );
    expect(command.routineThreadId).toBeNull();
  });

  it('never fails the run bookkeeping when the notification cannot be posted', async () => {
    const { createNotification, notifier } = setup();
    createNotification.execute.mockRejectedValue(new Error('Connection lost'));

    await expect(
      notifier.notify({
        routine: aRoutine(),
        failureReason: 'timeout',
        paused: false,
        routineThreadId: null,
      }),
    ).resolves.toBeUndefined();
  });

  it('posts nothing with the routines feature turned off', async () => {
    const { createNotification, notifier } = setup({ routinesEnabled: false });

    await notifier.notify({
      routine: aRoutine(),
      failureReason: 'timeout',
      paused: false,
      routineThreadId: null,
    });

    expect(createNotification.execute).not.toHaveBeenCalled();
  });
});
