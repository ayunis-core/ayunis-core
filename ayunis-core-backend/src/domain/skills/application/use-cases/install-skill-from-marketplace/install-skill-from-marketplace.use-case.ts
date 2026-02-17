import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UUID } from 'crypto';
import { SkillRepository } from '../../ports/skill.repository';
import { InstallSkillFromMarketplaceCommand } from './install-skill-from-marketplace.command';
import { Skill } from '../../../domain/skill.entity';
import { GetMarketplaceSkillUseCase } from 'src/domain/marketplace/application/use-cases/get-marketplace-skill/get-marketplace-skill.use-case';
import { GetMarketplaceSkillQuery } from 'src/domain/marketplace/application/use-cases/get-marketplace-skill/get-marketplace-skill.query';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationError } from 'src/common/errors/base.error';
import { MarketplaceInstallFailedError } from '../../skills.errors';

@Injectable()
export class InstallSkillFromMarketplaceUseCase {
  private readonly logger = new Logger(InstallSkillFromMarketplaceUseCase.name);

  constructor(
    private readonly getMarketplaceSkillUseCase: GetMarketplaceSkillUseCase,
    private readonly skillRepository: SkillRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: InstallSkillFromMarketplaceCommand): Promise<Skill> {
    this.logger.log('execute', { identifier: command.identifier });

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    try {
      const marketplaceSkill = await this.getMarketplaceSkillUseCase.execute(
        new GetMarketplaceSkillQuery(command.identifier),
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
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to install marketplace skill', {
        identifier: command.identifier,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new MarketplaceInstallFailedError(command.identifier);
    }
  }

  private async resolveUniqueName(
    baseName: string,
    userId: UUID,
  ): Promise<string> {
    let name = baseName;
    let suffix = 2;
    while (await this.skillRepository.findByNameAndOwner(name, userId)) {
      name = `${baseName} ${suffix}`;
      suffix++;
    }
    return name;
  }
}
