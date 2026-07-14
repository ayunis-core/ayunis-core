import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedLegalAcceptanceError } from 'src/iam/legal-acceptances/application/legal-acceptances.errors';
import { Injectable } from '@nestjs/common';
import { HasAcceptedLatestVersionQuery } from './has-accepted-latest-version.query';
import { LegalAcceptancesRepository } from '../../ports/legal-acceptances.repository';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HasAcceptedLatestVersionUseCase {
  constructor(
    private readonly legalAcceptanceRepository: LegalAcceptancesRepository,
    private readonly configService: ConfigService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedLegalAcceptanceError)
  async execute(query: HasAcceptedLatestVersionQuery): Promise<boolean> {
    const { orgId, type } = query;
    const legalAcceptance = await this.legalAcceptanceRepository.findOne(
      orgId,
      type,
      this.configService.get('legal.termsOfService.version')!,
    );

    return !!legalAcceptance;
  }
}
