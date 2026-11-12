import { randomUUID, type UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { RecordingRepository } from 'src/domain/recordings/application/ports/recording.repository';
import type { RecordingSummaryJobData } from 'src/domain/recordings/application/ports/recording-summary-queue.port';
import type { RecordingSummaryRepository } from 'src/domain/recordings/application/ports/recording-summary.repository';
import { RecordingSummaryNotRetryableError } from 'src/domain/recordings/application/recordings.errors';
import type { RecordingAccessService } from 'src/domain/recordings/application/services/recording-access.service';
import { RecordingSummaryScheduler } from 'src/domain/recordings/application/services/recording-summary-scheduler.service';
import { RecordingSummaryStatus } from 'src/domain/recordings/domain/recording-summary-status.enum';
import { RecordingSummary } from 'src/domain/recordings/domain/recording-summary.entity';
import { TeamRecording } from 'src/domain/recordings/domain/team-recording.entity';
import { RetryRecordingSummaryCommand } from './retry-recording-summary.command';
import { RetryRecordingSummaryUseCase } from './retry-recording-summary.use-case';

describe(RetryRecordingSummaryUseCase.name, () => {
  const orgId = randomUUID();
  const uploaderId = randomUUID();
  const managerId = randomUUID();
  const recording = new TeamRecording({
    name: 'Bauausschuss',
    orgId,
    teamId: randomUUID(),
    createdByUserId: uploaderId,
  });

  function summary(status: RecordingSummaryStatus, triggeredByUserId: UUID) {
    return new RecordingSummary({
      recordingId: recording.id,
      runId: randomUUID(),
      status,
      triggeredByUserId,
    });
  }

  function setup(options: {
    restarted?: RecordingSummary;
    current?: RecordingSummary;
    readOnly?: boolean;
  }) {
    const summaries = {
      restartFailed: jest.fn(
        (_recordingId: UUID, runId: UUID, triggeredByUserId: UUID) =>
          Promise.resolve(
            options.restarted
              ? new RecordingSummary({
                  ...options.restarted,
                  runId,
                  triggeredByUserId,
                })
              : null,
          ),
      ),
      findByRecordingId: jest.fn().mockResolvedValue(options.current ?? null),
      markFailed: jest.fn(),
    };
    const queued: RecordingSummaryJobData[] = [];
    const queue = {
      enqueue: (job: RecordingSummaryJobData) => {
        queued.push(job);
        return Promise.resolve();
      },
    };
    const useCase = new RetryRecordingSummaryUseCase(
      {
        findById: () => Promise.resolve(recording),
      } as unknown as RecordingRepository,
      summaries as unknown as RecordingSummaryRepository,
      {
        requireWrite: options.readOnly
          ? () => Promise.reject(new UnauthorizedAccessError())
          : () => Promise.resolve(),
      } as unknown as RecordingAccessService,
      new RecordingSummaryScheduler(
        queue,
        summaries as unknown as RecordingSummaryRepository,
      ),
      {
        get: (key: string) =>
          ({
            userId: managerId,
            orgId,
            role: 'manager',
            systemRole: 'user',
          })[key],
      } as unknown as ContextService,
    );
    return { useCase, summaries, queued };
  }

  const command = new RetryRecordingSummaryCommand(recording.id);

  it('queues a new run of a failed summary, billed to the manager who asked', async () => {
    const { useCase, queued } = setup({
      restarted: summary(RecordingSummaryStatus.PENDING, uploaderId),
    });

    await useCase.execute(command);

    expect(queued).toEqual([
      expect.objectContaining({
        recordingId: recording.id,
        orgId,
        userId: managerId,
      }),
    ]);
  });

  it('queues no second run when asked again while the first is queued or running', async () => {
    const { useCase, queued } = setup({
      current: summary(RecordingSummaryStatus.RUNNING, managerId),
    });

    await useCase.execute(command);

    expect(queued).toEqual([]);
  });

  it('does not replace a generated summary', async () => {
    const { useCase, queued } = setup({
      current: summary(RecordingSummaryStatus.READY, uploaderId),
    });

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      RecordingSummaryNotRetryableError,
    );
    expect(queued).toEqual([]);
  });

  it('starts nothing for a reader who may not manage the recording', async () => {
    const { useCase, summaries, queued } = setup({
      readOnly: true,
      restarted: summary(RecordingSummaryStatus.PENDING, uploaderId),
    });

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      UnauthorizedAccessError,
    );
    expect(summaries.restartFailed).not.toHaveBeenCalled();
    expect(queued).toEqual([]);
  });
});
