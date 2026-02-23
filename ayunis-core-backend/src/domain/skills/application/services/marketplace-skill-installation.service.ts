import { Inject, Injectable, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import { GetMarketplaceSkillUseCase } from 'src/domain/marketplace/application/use-cases/get-marketplace-skill/get-marketplace-skill.use-case';
import { GetMarketplaceSkillQuery } from 'src/domain/marketplace/application/use-cases/get-marketplace-skill/get-marketplace-skill.query';
import { MarketplaceClient } from 'src/domain/marketplace/application/ports/marketplace-client.port';
import { SkillRepository } from '../ports/skill.repository';
import { Skill } from '../../domain/skill.entity';

const MAX_NAME_RESOLUTION_ATTEMPTS = 100;

@Injectable()
export class MarketplaceSkillInstallationService {
  private readonly logger = new Logger(
    MarketplaceSkillInstallationService.name,
  );

  constructor(
    private readonly getMarketplaceSkillUseCase: GetMarketplaceSkillUseCase,
    @Inject(SkillRepository)
    private readonly skillRepository: SkillRepository,
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
        this.logger.debug('Pre-installed skill created and activated', {
          identifier: skillSummary.identifier,
          userId,
        });
        successCount++;
      } catch (error) {
        this.logger.error('Failed to install individual pre-installed skill', {
          identifier: skillSummary.identifier,
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
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
        'Marketplace unavailable, skipping pre-installed skills',
        { error: error instanceof Error ? error.message : 'Unknown error' },
      );
      return [];
    }
  }

  async installFromMarketplace(
    identifier: string,
    userId: UUID,
  ): Promise<Skill> {
    this.logger.log('installFromMarketplace', { identifier, userId });

    const marketplaceSkill = await this.getMarketplaceSkillUseCase.execute(
      new GetMarketplaceSkillQuery(identifier),
    );

    const name = await this.resolveUniqueName(marketplaceSkill.name, userId);

    const skill = new Skill({
      name,
      shortDescription: marketplaceSkill.shortDescription,
      instructions: marketplaceSkill.instructions,
      marketplaceIdentifier: marketplaceSkill.identifier,
      userId,
    });

    const created = await this.skillRepository.create(skill);
    await this.skillRepository.activateSkill(created.id, userId);

    return created;
  }

  private async resolveUniqueName(
    baseName: string,
    userId: UUID,
  ): Promise<string> {
    let name = baseName;
    let suffix = 2;
    while (await this.skillRepository.findByNameAndOwner(name, userId)) {
      if (suffix > MAX_NAME_RESOLUTION_ATTEMPTS) {
        throw new Error(
          `Could not resolve unique name for "${baseName}" after ${MAX_NAME_RESOLUTION_ATTEMPTS} attempts`,
        );
      }
      name = `${baseName} ${suffix}`;
      suffix++;
    }
    return name;
  }
}
