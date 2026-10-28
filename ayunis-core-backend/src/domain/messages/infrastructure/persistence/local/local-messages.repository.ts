import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MessageRecord } from './schema/message.record';
import { Message } from 'src/domain/messages/domain/message.entity';
import { MessageMapper } from './mappers/message.mapper';
import { UUID } from 'crypto';
import { MessagesRepository } from 'src/domain/messages/application/ports/messages.repository';
import { Injectable } from '@nestjs/common';
import { MessageThreadMissingError } from 'src/domain/messages/application/messages.errors';

const PG_FOREIGN_KEY_VIOLATION = '23503';
const MESSAGES_THREAD_FOREIGN_KEY = 'FK_15f9bd2bf472ff12b6ee20012d0';

function matchesThreadForeignKey(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const record = error as Record<string, unknown>;
  if (
    record.code === PG_FOREIGN_KEY_VIOLATION &&
    record.constraint === MESSAGES_THREAD_FOREIGN_KEY
  ) {
    return true;
  }
  const driverError = record.driverError;
  if (typeof driverError !== 'object' || driverError === null) return false;
  const driverRecord = driverError as Record<string, unknown>;
  return (
    driverRecord.code === PG_FOREIGN_KEY_VIOLATION &&
    driverRecord.constraint === MESSAGES_THREAD_FOREIGN_KEY
  );
}

@Injectable()
export class LocalMessagesRepository extends MessagesRepository {
  constructor(
    @InjectRepository(MessageRecord)
    private readonly repository: Repository<MessageRecord>,
    private readonly messageMapper: MessageMapper,
  ) {
    super();
  }

  async create(message: Message): Promise<Message> {
    const messageEntity = this.messageMapper.toRecord(message);
    try {
      const savedMessageEntity = await this.repository.save(messageEntity);
      return this.messageMapper.toDomain(savedMessageEntity);
    } catch (error) {
      if (matchesThreadForeignKey(error)) {
        throw new MessageThreadMissingError(message.threadId);
      }
      throw error;
    }
  }

  async findById(id: UUID): Promise<Message | null> {
    const messageEntity = await this.repository.findOne({ where: { id } });
    return messageEntity ? this.messageMapper.toDomain(messageEntity) : null;
  }

  async findManyByThreadId(threadId: UUID): Promise<Message[]> {
    const messageEntities = await this.repository.find({
      where: { threadId },
      order: { createdAt: 'ASC' },
    });
    return messageEntities.map((messageEntity) =>
      this.messageMapper.toDomain(messageEntity),
    );
  }

  async delete(id: UUID): Promise<void> {
    await this.repository.delete(id);
  }
}
