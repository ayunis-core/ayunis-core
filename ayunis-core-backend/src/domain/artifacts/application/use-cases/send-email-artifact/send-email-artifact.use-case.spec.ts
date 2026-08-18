import type { PinoLogger } from 'nestjs-pino';
import type { UUID } from 'crypto';
import { EmailDeliveryStatus } from '../../../domain/email-delivery.entity';
import { EmailArtifact } from '../../../domain/artifact.entity';
import { ArtifactVersion } from '../../../domain/artifact-version.entity';
import { AuthorType } from '../../../domain/value-objects/author-type.enum';
import type { EmailDeliveryRepository } from '../../ports/email-delivery.repository.port';
import type { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { SendEmailArtifactCommand } from './send-email-artifact.command';
import { SendEmailArtifactUseCase } from './send-email-artifact.use-case';
import type { ContextService } from 'src/common/context/services/context.service';
import type { GetThreadPiiMasksUseCase } from 'src/domain/thread-pii-masks/application/use-cases/get-thread-pii-masks/get-thread-pii-masks.use-case';
import type { SendEmailUseCase } from 'src/common/emails/application/use-cases/send-email/send-email.use-case';
import { EmailDelivery } from '../../../domain/email-delivery.entity';

describe('SendEmailArtifactUseCase', () => {
  const userId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const artifactId = '223e4567-e89b-12d3-a456-426614174000' as UUID;
  const threadId = '323e4567-e89b-12d3-a456-426614174000' as UUID;
  const artifact = new EmailArtifact({
    id: artifactId,
    threadId,
    userId,
    title: 'Welcome',
    currentVersionNumber: 1,
    versions: [
      new ArtifactVersion({
        artifactId,
        versionNumber: 1,
        authorType: AuthorType.ASSISTANT,
        content: JSON.stringify({
          format: 'email-v1',
          subject: 'Hello {{pii:PERSON_NAME_1}}',
          to: ['{{pii:EMAIL_ADDRESS_1}}'],
          cc: [],
          bcc: [],
          body: 'Welcome, {{pii:PERSON_NAME_1}}.',
        }),
      }),
    ],
  });

  it('deanonymizes and sends the current version once', async () => {
    const artifactsRepository = {
      findByIdWithVersions: jest.fn().mockResolvedValue(artifact),
    } as unknown as jest.Mocked<ArtifactsRepository>;
    const delivery = new EmailDelivery({ artifactId, versionNumber: 1 });
    const emailDeliveryRepository = {
      findByArtifactVersion: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(delivery),
      claimForDelivery: jest.fn().mockResolvedValue(true),
      markSent: jest.fn(),
      markFailed: jest.fn(),
    } as unknown as jest.Mocked<EmailDeliveryRepository>;
    const sendEmailUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<SendEmailUseCase>;
    const contextService = {
      get: jest.fn().mockReturnValue(userId),
    } as unknown as jest.Mocked<ContextService>;
    const getMasksUseCase = {
      execute: jest.fn().mockResolvedValue([
        { token: '{{pii:PERSON_NAME_1}}', value: 'Ada' },
        { token: '{{pii:EMAIL_ADDRESS_1}}', value: 'ada@example.com' },
      ]),
    } as unknown as jest.Mocked<GetThreadPiiMasksUseCase>;
    const logger = {
      info: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<PinoLogger>;
    const useCase = new SendEmailArtifactUseCase(
      logger,
      artifactsRepository,
      emailDeliveryRepository,
      contextService,
      getMasksUseCase,
      sendEmailUseCase,
    );

    const result = await useCase.execute(
      new SendEmailArtifactCommand({ artifactId }),
    );

    expect(result.status).toBe(EmailDeliveryStatus.SENT);
    expect(sendEmailUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['ada@example.com'],
        subject: 'Hello Ada',
        text: 'Welcome, Ada.',
      }),
    );
    expect(emailDeliveryRepository.markSent).toHaveBeenCalledWith(
      delivery.id,
      expect.any(Date),
    );
  });

  it('does not send a version that was already sent', async () => {
    const sentDelivery = new EmailDelivery({
      artifactId,
      versionNumber: 1,
      status: EmailDeliveryStatus.SENT,
      sentAt: new Date(),
    });
    const emailDeliveryRepository = {
      findByArtifactVersion: jest.fn().mockResolvedValue(sentDelivery),
      create: jest.fn(),
      claimForDelivery: jest.fn().mockResolvedValue(true),
      markSent: jest.fn(),
      markFailed: jest.fn(),
    } as unknown as jest.Mocked<EmailDeliveryRepository>;
    const sendEmailUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<SendEmailUseCase>;
    const useCase = new SendEmailArtifactUseCase(
      {
        info: jest.fn(),
        error: jest.fn(),
      } as unknown as jest.Mocked<PinoLogger>,
      {
        findByIdWithVersions: jest.fn().mockResolvedValue(artifact),
      } as unknown as jest.Mocked<ArtifactsRepository>,
      emailDeliveryRepository,
      {
        get: jest.fn().mockReturnValue(userId),
      } as unknown as jest.Mocked<ContextService>,
      {
        execute: jest.fn(),
      } as unknown as jest.Mocked<GetThreadPiiMasksUseCase>,
      sendEmailUseCase,
    );

    const result = await useCase.execute(
      new SendEmailArtifactCommand({ artifactId }),
    );

    expect(result).toBe(sentDelivery);
    expect(sendEmailUseCase.execute).not.toHaveBeenCalled();
  });
});
