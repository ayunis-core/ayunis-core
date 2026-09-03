import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { UserSystemPromptsRepository } from 'src/domain/chat-settings/application/ports/user-system-prompts.repository';
import { UserSystemPrompt } from 'src/domain/chat-settings/domain/user-system-prompt.entity';
import { UserSystemPromptRecord } from './schema/user-system-prompt.record';
import { UserSystemPromptMapper } from './mappers/user-system-prompt.mapper';

@Injectable()
export class LocalUserSystemPromptsRepository extends UserSystemPromptsRepository {
  private readonly logger = new Logger(LocalUserSystemPromptsRepository.name);

  constructor(
    @InjectRepository(UserSystemPromptRecord)
    private readonly repository: Repository<UserSystemPromptRecord>,
    private readonly mapper: UserSystemPromptMapper,
  ) {
    super();
  }

  async findByUserId(userId: UUID): Promise<UserSystemPrompt | null> {
    this.logger.log({ userId }, 'findByUserId');

    const record = await this.repository.findOne({ where: { userId } });

    if (!record) {
      this.logger.debug({ userId }, 'No user system prompt found');
      return null;
    }

    return this.mapper.toDomain(record);
  }

  async upsert(userSystemPrompt: UserSystemPrompt): Promise<UserSystemPrompt> {
    this.logger.log({ userId: userSystemPrompt.userId }, 'upsert');

    const record = this.mapper.toRecord(userSystemPrompt);

    // Use atomic upsert with conflict resolution on userId
    await this.repository.upsert(record, {
      conflictPaths: ['userId'],
      skipUpdateIfNoValuesChanged: true,
    });

    // Fetch the saved record to get the actual id (may be existing or new)
    const savedRecord = await this.repository.findOneOrFail({
      where: { userId: userSystemPrompt.userId },
    });

    this.logger.debug(
      {
        userId: userSystemPrompt.userId,
        id: savedRecord.id,
      },
      'User system prompt upserted',
    );

    return this.mapper.toDomain(savedRecord);
  }

  async deleteByUserId(userId: UUID): Promise<void> {
    this.logger.log({ userId }, 'deleteByUserId');

    await this.repository.delete({ userId });

    this.logger.debug({ userId }, 'User system prompt deleted');
  }
}
