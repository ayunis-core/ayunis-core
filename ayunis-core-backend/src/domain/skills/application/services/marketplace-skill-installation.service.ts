import { Injectable, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import { GetMarketplaceSkillUseCase } from 'src/domain/marketplace/application/use-cases/get-marketplace-skill/get-marketplace-skill.use-case';
import { GetMarketplaceSkillQuery } from 'src/domain/marketplace/application/use-cases/get-marketplace-skill/get-marketplace-skill.query';
import { MarketplaceClient } from 'src/domain/marketplace/application/ports/marketplace-client.port';
import { CreateSkillWithUniqueNameUseCase } from 'src/domain/skills/application/use-cases/create-skill-with-unique-name/create-skill-with-unique-name.use-case';
import { CreateSkillWithUniqueNameCommand } from 'src/domain/skills/application/use-cases/create-skill-with-unique-name/create-skill-with-unique-name.command';
import { Skill } from 'src/domain/skills/domain/skill.entity';

@Injectable()
export class MarketplaceSkillInstallationService {
  private readonly logger = new Logger(
    MarketplaceSkillInstallationService.name,
  );

  constructor(
    private readonly getMarketplaceSkillUseCase: GetMarketplaceSkillUseCase,
    private readonly createSkillWithUniqueNameUseCase: CreateSkillWithUniqueNameUseCase,
    private readonly marketplaceClient: MarketplaceClient,
  ) {}

  async installAllPreInstalled(userId: UUID): Promise<number> {
    const preInstalledSkills = await this.fetchPreInstalledSkills();

    if (preInstalledSkills.length === 0) {
      this.logger.debug('No pre-installed skills found');
      return 0;
    }

    let successCount = 0;
    for (const skillSummary of preInstalledSkills) {
      try {
        await this.installFromMarketplace(skillSummary.identifier, userId);
        this.logger.debug(
          {
            identifier: skillSummary.identifier,
            userId,
          },
          'Pre-installed skill created and activated',
        );
        successCount++;
      } catch (error) {
        this.logger.error(
          {
            identifier: skillSummary.identifier,
            userId,
            err: error as Error,
          },
          'Failed to install individual pre-installed skill',
        );
      }
    }

    return successCount;
  }

  private async fetchPreInstalledSkills(): ReturnType<
    MarketplaceClient['getPreInstalledSkills']
  > {
    try {
      return await this.marketplaceClient.getPreInstalledSkills();
    } catch (error) {
      this.logger.warn(
        { err: error as Error },
        'Marketplace unavailable, skipping pre-installed skills',
      );
      return [];
    }
  }

  async installFromMarketplace(
    identifier: string,
    userId: UUID,
  ): Promise<Skill> {
    this.logger.log({ identifier, userId }, 'installFromMarketplace');

    const marketplaceSkill = await this.getMarketplaceSkillUseCase.execute(
      new GetMarketplaceSkillQuery(identifier),
    );

    return this.createSkillWithUniqueNameUseCase.execute(
      new CreateSkillWithUniqueNameCommand({
        name: marketplaceSkill.name,
        // aiDescription is the activation trigger shown to the LLM;
        // shortDescription is marketing copy for marketplace cards
        shortDescription: marketplaceSkill.aiDescription,
        instructions: marketplaceSkill.instructions,
        marketplaceIdentifier: marketplaceSkill.identifier,
        userId,
      }),
    );
  }
}
