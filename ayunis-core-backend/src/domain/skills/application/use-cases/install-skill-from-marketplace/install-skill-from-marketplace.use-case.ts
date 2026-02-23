import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Skill } from '../../../domain/skill.entity';
import { InstallSkillFromMarketplaceCommand } from './install-skill-from-marketplace.command';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationError } from 'src/common/errors/base.error';
import { MarketplaceInstallFailedError } from '../../skills.errors';
import { MarketplaceSkillInstallationService } from '../../services/marketplace-skill-installation.service';

@Injectable()
export class InstallSkillFromMarketplaceUseCase {
  private readonly logger = new Logger(InstallSkillFromMarketplaceUseCase.name);

  constructor(
    private readonly skillInstallationService: MarketplaceSkillInstallationService,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: InstallSkillFromMarketplaceCommand): Promise<Skill> {
    this.logger.log('execute', { identifier: command.identifier });

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    try {
      return await this.skillInstallationService.installFromMarketplace(
        command.identifier,
        userId,
      );
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
}
