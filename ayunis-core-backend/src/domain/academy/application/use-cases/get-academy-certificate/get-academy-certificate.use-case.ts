import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { FindUserByIdQuery } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.query';
import { AcademyCompletionRepository } from '../../ports/academy-completion.repository';
import { CertificateRendererPort } from '../../ports/certificate-renderer.port';
import {
  AcademyCompletionNotFoundError,
  UnexpectedAcademyError,
} from '../../academy.errors';
import { GetAcademyCertificateQuery } from './get-academy-certificate.query';

export interface AcademyCertificateFile {
  readonly buffer: Buffer;
  readonly fileName: string;
  readonly mimeType: string;
}

export const CERTIFICATE_FILE_NAME =
  'Ayunis-Core-KI-Fuehrerschein-Zertifikat.pdf';

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

  async execute(
    query: GetAcademyCertificateQuery,
  ): Promise<AcademyCertificateFile> {
    this.logger.log('Getting academy certificate', { userId: query.userId });
    try {
      const completion = await this.completionRepository.findByUser(
        query.userId,
      );
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
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error getting academy certificate', {
        error: error as Error,
      });
      throw new UnexpectedAcademyError(error);
    }
  }
}
