import { Inject, Injectable, Logger } from '@nestjs/common';
import { SharesRepository } from '../../ports/shares-repository.port';
import { FindAllSharesByEntityQuery } from './find-all-shares-by-entity.query';
import type { Share } from '../../../domain/share.entity';

@Injectable()
export class FindAllSharesByEntityUseCase {
  private readonly logger = new Logger(FindAllSharesByEntityUseCase.name);

  constructor(
    @Inject(SharesRepository)
    private readonly sharesRepository: SharesRepository,
  ) {}

  async execute(query: FindAllSharesByEntityQuery): Promise<Share[]> {
    this.logger.log('execute', {
      entityId: query.entityId,
      entityType: query.entityType,
    });

    return this.sharesRepository.findByEntityIdAndType(
      query.entityId,
      query.entityType,
    );
  }
}
