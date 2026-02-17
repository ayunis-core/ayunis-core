import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SharesRepository } from '../../ports/shares-repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { UUID } from 'crypto';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ApplicationError } from 'src/common/errors/base.error';
import { Transactional } from '@nestjs-cls/transactional';
import { ShareDeletedEvent } from '../../events/share-deleted.event';
import { Share, AgentShare, SkillShare } from '../../../domain/share.entity';
import { SharedEntityType } from '../../../domain/value-objects/shared-entity-type.enum';

interface DeleteResult {
  entityType: SharedEntityType;
  entityId: UUID;
  ownerId: UUID;
}

@Injectable()
export class DeleteShareUseCase {
  private logger = new Logger(DeleteShareUseCase.name);
  constructor(
    private readonly repository: SharesRepository,
    private readonly contextService: ContextService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(id: UUID): Promise<void> {
    // Execute delete within transaction
    const result = await this.executeDelete(id);

    // Emit event AFTER transaction commits so listener sees committed data
    // Use emitAsync to await listener completion and propagate errors
    await this.eventEmitter.emitAsync(
      ShareDeletedEvent.EVENT_NAME,
      new ShareDeletedEvent(result.entityType, result.entityId, result.ownerId),
    );
  }

  @Transactional()
  private async executeDelete(id: UUID): Promise<DeleteResult> {
    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedAccessError();
      }

      const share = await this.repository.findById(id);
      if (!share) {
        throw new NotFoundException('Share not found');
      }

      if (share.ownerId !== userId) {
        throw new UnauthorizedAccessError();
      }

      await this.repository.delete(share);

      return {
        entityType: share.entityType,
        entityId: this.getEntityId(share),
        ownerId: share.ownerId,
      };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(error);
      throw new Error('Unexpected error occurred');
    }
  }

  private getEntityId(share: Share): UUID {
    if (share instanceof AgentShare) return share.agentId;
    if (share instanceof SkillShare) return share.skillId;
    throw new Error(`Unknown share type: ${share.entityType}`);
  }
}
