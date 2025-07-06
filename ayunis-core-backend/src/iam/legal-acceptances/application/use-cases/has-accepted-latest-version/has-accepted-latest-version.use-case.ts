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
