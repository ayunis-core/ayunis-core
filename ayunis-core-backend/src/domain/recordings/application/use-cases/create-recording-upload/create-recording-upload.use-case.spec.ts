import { randomUUID, type UUID } from 'crypto';
import type { ConfigType } from '@nestjs/config';
import type { ContextService } from 'src/common/context/services/context.service';
import type transcriptionConfig from 'src/config/transcription.config';
import type { RecordingAudio } from 'src/domain/recordings/application/models/recording-audio';
import type { RecordingRepository } from 'src/domain/recordings/application/ports/recording.repository';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { RecordingAudioAlreadyUploadedError } from 'src/domain/recordings/application/recordings.errors';
import type { RecordingAccessService } from 'src/domain/recordings/application/services/recording-access.service';
import { PersonalRecording } from 'src/domain/recordings/domain/personal-recording.entity';
import type { CreateSourceUploadSessionCommand } from 'src/domain/sources/application/use-cases/create-source-upload-session/create-source-upload-session.command';
import type { CreateSourceUploadSessionUseCase } from 'src/domain/sources/application/use-cases/create-source-upload-session/create-source-upload-session.use-case';
import type { CheckQuotaQuery } from 'src/iam/quotas/application/use-cases/check-quota/check-quota.query';
import type { CheckQuotaUseCase } from 'src/iam/quotas/application/use-cases/check-quota/check-quota.use-case';
import { QuotaType } from 'src/iam/quotas/domain/quota-type.enum';
import { CreateRecordingUploadCommand } from './create-recording-upload.command';
import { CreateRecordingUploadUseCase } from './create-recording-upload.use-case';

describe(CreateRecordingUploadUseCase.name, () => {
  const orgId = randomUUID();
  const userId = randomUUID();
  const recording = new PersonalRecording({
    name: 'Stadtratssitzung',
    orgId,
    userId,
    createdByUserId: userId,
  });

  function setup(options: { audio?: boolean; readOnly?: boolean } = {}) {
    const repository = {
      findById: jest.fn().mockResolvedValue(recording),
      findAudio: jest
        .fn()
        .mockResolvedValue(
          new Map<UUID, RecordingAudio>(
            options.audio ? [[recording.id, {} as RecordingAudio]] : [],
          ),
        ),
    };
    const access = {
      requireWrite: options.readOnly
        ? jest.fn().mockRejectedValue(new UnauthorizedAccessError())
        : jest.fn().mockResolvedValue(undefined),
    };
    const createSession = {
      execute: async (command: CreateSourceUploadSessionCommand) => {
        await command.admit?.();
        return { session: {}, partSizeBytes: 1 };
      },
    };
    const charged: CheckQuotaQuery[] = [];
    const checkQuota = {
      execute: (query: CheckQuotaQuery) => {
        charged.push(query);
        return Promise.resolve();
      },
    };
    const context = {
      get: (key: string) =>
        ({ userId, orgId, role: 'user', systemRole: 'user' })[key],
    };
    const useCase = new CreateRecordingUploadUseCase(
      repository as unknown as RecordingRepository,
      access as unknown as RecordingAccessService,
      createSession as unknown as CreateSourceUploadSessionUseCase,
      checkQuota as unknown as CheckQuotaUseCase,
      context as unknown as ContextService,
      { maxUploadBytes: 1024 } as ConfigType<typeof transcriptionConfig>,
    );
    return { useCase, charged };
  }

  const upload = new CreateRecordingUploadCommand({
    recordingId: recording.id,
    fileName: 'sitzung.mp3',
    mimeType: 'audio/mpeg',
    fileSize: 512,
  });

  it("charges an upload to the uploader's recording limit, not to a chat or image limit", async () => {
    const { useCase, charged } = setup();

    await useCase.execute(upload);

    expect(charged).toEqual([
      expect.objectContaining({
        userId,
        orgId,
        quotaType: QuotaType.FAIR_USE_RECORDINGS,
      }),
    ]);
  });

  it('does not charge a user who may only read the recording', async () => {
    const { useCase, charged } = setup({ readOnly: true });

    await expect(useCase.execute(upload)).rejects.toBeInstanceOf(
      UnauthorizedAccessError,
    );
    expect(charged).toEqual([]);
  });

  it('does not charge a second upload to a recording that has its audio', async () => {
    const { useCase, charged } = setup({ audio: true });

    await expect(useCase.execute(upload)).rejects.toBeInstanceOf(
      RecordingAudioAlreadyUploadedError,
    );
    expect(charged).toEqual([]);
  });
});
