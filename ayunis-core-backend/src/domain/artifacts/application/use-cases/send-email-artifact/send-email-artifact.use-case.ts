import type { UUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { SendEmailUseCase } from 'src/common/emails/application/use-cases/send-email/send-email.use-case';
import { SendEmailCommand } from 'src/common/emails/application/use-cases/send-email/send-email.command';
import { deanonymizeText } from 'src/common/anonymization/domain/deanonymize-text';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { GetThreadPiiMasksUseCase } from 'src/domain/thread-pii-masks/application/use-cases/get-thread-pii-masks/get-thread-pii-masks.use-case';
import { GetThreadPiiMasksQuery } from 'src/domain/thread-pii-masks/application/use-cases/get-thread-pii-masks/get-thread-pii-masks.query';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { EmailDeliveryRepository } from '../../ports/email-delivery.repository.port';
import {
  ArtifactEmailDeliveryInProgressError,
  ArtifactEmailNotSendableError,
  ArtifactVersionNotFoundError,
  ArtifactNotFoundError,
  UnexpectedArtifactError,
} from '../../artifacts.errors';
import { parseEmailContent } from '../../helpers/email-content-format';
import {
  EmailDelivery,
  EmailDeliveryStatus,
} from '../../../domain/email-delivery.entity';
import { EmailArtifact } from '../../../domain/artifact.entity';
import type { ArtifactVersion } from '../../../domain/artifact-version.entity';
import type { EmailContentV1 } from '../../helpers/email-content-format';
import { SendEmailArtifactCommand } from './send-email-artifact.command';

const PENDING_DELIVERY_TIMEOUT_MS = 10 * 60 * 1000;

@Injectable()
export class SendEmailArtifactUseCase {
  constructor(
    @InjectPinoLogger(SendEmailArtifactUseCase.name)
    private readonly logger: PinoLogger,
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly emailDeliveryRepository: EmailDeliveryRepository,
    private readonly contextService: ContextService,
    private readonly getThreadPiiMasksUseCase: GetThreadPiiMasksUseCase,
    private readonly sendEmailUseCase: SendEmailUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedArtifactError)
  async execute(command: SendEmailArtifactCommand): Promise<EmailDelivery> {
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();

    const { artifact, version, content } = await this.loadCurrentEmail(
      command.artifactId,
      userId,
    );
    const existing = await this.emailDeliveryRepository.findByArtifactVersion(
      artifact.id,
      version.versionNumber,
    );
    if (existing?.status === EmailDeliveryStatus.SENT) return existing;

    const delivery = await this.prepareDelivery(
      existing,
      artifact.id,
      version.versionNumber,
    );
    if (delivery.status === EmailDeliveryStatus.SENT) return delivery;
    return await this.deliver(delivery, artifact, version, content);
  }

  private async loadCurrentEmail(
    artifactId: UUID,
    userId: UUID,
  ): Promise<{
    artifact: EmailArtifact;
    version: ArtifactVersion;
    content: EmailContentV1;
  }> {
    const artifact = await this.artifactsRepository.findByIdWithVersions(
      artifactId,
      userId,
    );
    if (!artifact) throw new ArtifactNotFoundError(artifactId);
    if (!(artifact instanceof EmailArtifact)) {
      throw new ArtifactEmailNotSendableError(artifact.type);
    }

    const version = artifact.versions.find(
      (candidate) => candidate.versionNumber === artifact.currentVersionNumber,
    );
    if (!version) {
      throw new ArtifactVersionNotFoundError(
        artifactId,
        artifact.currentVersionNumber,
      );
    }

    return { artifact, version, content: parseEmailContent(version.content) };
  }

  private async deliver(
    delivery: EmailDelivery,
    artifact: EmailArtifact,
    version: ArtifactVersion,
    content: EmailContentV1,
  ): Promise<EmailDelivery> {
    try {
      const masks = await this.getThreadPiiMasksUseCase.execute(
        new GetThreadPiiMasksQuery(artifact.threadId),
      );
      const tokenToValue = new Map(
        masks.map((mask) => [mask.token, mask.value]),
      );
      await this.sendEmailUseCase.execute(
        this.buildEmailCommand(content, tokenToValue),
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.emailDeliveryRepository.markFailed(delivery.id, message);
      delivery.status = EmailDeliveryStatus.FAILED;
      delivery.errorMessage = message;
      delivery.updatedAt = new Date();
      this.logger.error(
        { artifactId: artifact.id, versionNumber: version.versionNumber },
        'Email artifact delivery failed',
      );
      throw error;
    }

    // SMTP success is irreversible; do not mark the delivery failed if persisting SENT fails.
    const sentAt = new Date();
    await this.emailDeliveryRepository.markSent(delivery.id, sentAt);
    delivery.status = EmailDeliveryStatus.SENT;
    delivery.sentAt = sentAt;
    delivery.updatedAt = sentAt;
    return delivery;
  }

  private buildEmailCommand(
    content: EmailContentV1,
    tokenToValue: ReadonlyMap<string, string>,
  ): SendEmailCommand {
    return new SendEmailCommand({
      to: content.to.map((recipient) =>
        deanonymizeText(recipient, tokenToValue),
      ),
      cc: content.cc.map((recipient) =>
        deanonymizeText(recipient, tokenToValue),
      ),
      bcc: content.bcc.map((recipient) =>
        deanonymizeText(recipient, tokenToValue),
      ),
      subject: deanonymizeText(content.subject, tokenToValue),
      text: deanonymizeText(content.body, tokenToValue),
    });
  }

  private async prepareDelivery(
    existing: EmailDelivery | null,
    artifactId: UUID,
    versionNumber: number,
  ): Promise<EmailDelivery> {
    if (existing) {
      const claimed = await this.claimDelivery(existing);
      if (!claimed) throw new ArtifactEmailDeliveryInProgressError(artifactId);
      return existing;
    }

    const candidate = new EmailDelivery({ artifactId, versionNumber });
    const delivery = await this.emailDeliveryRepository.create(candidate);
    if (
      delivery.id === candidate.id ||
      delivery.status === EmailDeliveryStatus.SENT
    ) {
      return delivery;
    }
    const claimed = await this.claimDelivery(delivery);
    if (!claimed) throw new ArtifactEmailDeliveryInProgressError(artifactId);
    return delivery;
  }

  private async claimDelivery(delivery: EmailDelivery): Promise<boolean> {
    const claimed = await this.emailDeliveryRepository.claimForDelivery(
      delivery.id,
      new Date(Date.now() - PENDING_DELIVERY_TIMEOUT_MS),
    );
    if (claimed) {
      delivery.status = EmailDeliveryStatus.PENDING;
      delivery.errorMessage = null;
      delivery.sentAt = null;
      delivery.updatedAt = new Date();
    }
    return claimed;
  }
}
