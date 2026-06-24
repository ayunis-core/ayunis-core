import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Skill } from '../../../domain/skill.entity';
import { InstallSkillFromMarketplaceCommand } from './install-skill-from-marketplace.command';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationError } from 'src/common/errors/base.error';
import { MarketplaceInstallFailedError } from '../../skills.errors';
import { MarketplaceSkillInstallationService } from '../../services/marketplace-skill-installation.service';
import { MarketplaceSkillInstalledEvent } from '../../events/marketplace-skill-installed.event';

@Injectable()
export class InstallSkillFromMarketplaceUseCase {
  private readonly logger = new Logger(InstallSkillFromMarketplaceUseCase.name);

  constructor(
    private readonly skillInstallationService: MarketplaceSkillInstallationService,
    private readonly contextService: ContextService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: InstallSkillFromMarketplaceCommand): Promise<Skill> {
    this.logger.log('execute', { identifier: command.identifier });

    const userId = this.contextService.get('userId');
    const orgId = this.contextService.get('orgId');
    if (!userId || !orgId) {
      throw new UnauthorizedException('User not authenticated');
    }

    try {
      const skill = await this.skillInstallationService.installFromMarketplace(
        command.identifier,
        userId,
      );

      const identifier = skill.marketplaceIdentifier ?? command.identifier;
      this.eventEmitter
        .emitAsync(
          MarketplaceSkillInstalledEvent.EVENT_NAME,
          new MarketplaceSkillInstalledEvent(userId, orgId, identifier),
        )
        .catch((err: unknown) => {
          this.logger.error('Failed to emit MarketplaceSkillInstalledEvent', {
            error: err instanceof Error ? err.message : 'Unknown error',
            identifier,
            userId,
          });
        });

      return skill;
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
