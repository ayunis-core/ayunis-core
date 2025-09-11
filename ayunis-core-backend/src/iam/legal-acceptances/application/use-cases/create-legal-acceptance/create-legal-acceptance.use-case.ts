import { Injectable, Logger } from '@nestjs/common';
import {
  CreateLegalAcceptanceCommand,
  CreateModelProviderAcceptanceCommand,
  CreatePrivacyPolicyAcceptanceCommand,
  CreateTosAcceptanceCommand,
} from './create-legal-acceptance.command';
import { LegalAcceptance } from 'src/iam/legal-acceptances/domain/legal-acceptance.entity';
import { ConfigService } from '@nestjs/config';
import { LegalAcceptancesRepository } from '../../ports/legal-acceptances.repository';
import { TosAcceptance } from 'src/iam/legal-acceptances/domain/legal-acceptance-variants/tos-acceptance.entity';
import { ModelProviderAcceptance } from 'src/iam/legal-acceptances/domain/legal-acceptance-variants/model-provider-acceptance.entity';
import { PrivacyPolicyAcceptance } from 'src/iam/legal-acceptances/domain/legal-acceptance-variants/privacy-policy-acceptance.entity';

@Injectable()
export class CreateLegalAcceptanceUseCase {
  private readonly logger = new Logger(CreateLegalAcceptanceUseCase.name);

  constructor(
    private readonly legalAcceptanceRepository: LegalAcceptancesRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: CreateLegalAcceptanceCommand): Promise<void> {
    const { userId, orgId, type } = command;
    this.logger.log(
      `Creating legal acceptance for user ${userId} in org ${orgId} with type ${type}`,
    );
    const isSelfHosted = this.configService.get<boolean>('app.isSelfHosted');
    if (isSelfHosted) {
      return;
    }

    let legalAcceptance: LegalAcceptance;
    if (command instanceof CreateTosAcceptanceCommand) {
      legalAcceptance = new TosAcceptance({
        userId,
        orgId,
        version: this.configService.get('legal.termsOfService.version')!,
      });
    } else if (command instanceof CreatePrivacyPolicyAcceptanceCommand) {
      legalAcceptance = new PrivacyPolicyAcceptance({
        userId,
        orgId,
        version: this.configService.get('legal.privacyPolicy.version')!,
      });
    } else if (command instanceof CreateModelProviderAcceptanceCommand) {
      legalAcceptance = new ModelProviderAcceptance({
        userId,
        orgId,
        version: this.configService.get(
          `legal.providers.${command.provider}.version`,
        )!,
        provider: command.provider,
      });
    } else {
      throw new Error(`Unsupported legal acceptance type: ${type}`);
    }
    await this.legalAcceptanceRepository.create(legalAcceptance);
  }
}
