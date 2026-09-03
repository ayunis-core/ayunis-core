import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { FindUserByIdQuery } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.query';
import { AcademyCompletionRepository } from 'src/domain/academy/application/ports/academy-completion.repository';
import { CertificateRendererPort } from 'src/domain/academy/application/ports/certificate-renderer.port';
import {
  AcademyCompletionNotFoundError,
  UnexpectedAcademyError,
} from 'src/domain/academy/application/academy.errors';
import { GetAcademyCertificateQuery } from './get-academy-certificate.query';

export interface AcademyCertificateFile {
  readonly buffer: Buffer;
  readonly fileName: string;
  readonly mimeType: string;
}

export const CERTIFICATE_FILE_NAME =
  'Ayunis-Core-KI-Schulung-nach-EU-AI-Act-Zertifikat.pdf';

const CERTIFICATE_DATE_FORMAT = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

@Injectable()
export class GetAcademyCertificateUseCase {
  private readonly logger = new Logger(GetAcademyCertificateUseCase.name);

  constructor(
    private readonly completionRepository: AcademyCompletionRepository,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly certificateRenderer: CertificateRendererPort,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAcademyError)
  async execute(
    query: GetAcademyCertificateQuery,
  ): Promise<AcademyCertificateFile> {
    this.logger.log({ userId: query.userId }, 'Getting academy certificate');

    const completion = await this.completionRepository.findByUser(query.userId);
    if (!completion) {
      throw new AcademyCompletionNotFoundError({ userId: query.userId });
    }

    const user = await this.findUserByIdUseCase.execute(
      new FindUserByIdQuery(query.userId),
    );

    const dateLine = `${CERTIFICATE_DATE_FORMAT.format(completion.completedAt)}, München`;
    const buffer = await this.certificateRenderer.render({
      userName: user.name,
      dateLine,
    });

    return {
      buffer,
      fileName: CERTIFICATE_FILE_NAME,
      mimeType: 'application/pdf',
    };
  }
}
