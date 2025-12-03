import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MessageRecord } from './schema/message.record';
import { Message } from 'src/domain/messages/domain/message.entity';
import { MessageMapper } from './mappers/message.mapper';
import { UUID } from 'crypto';
import { MessagesRepository } from 'src/domain/messages/application/ports/messages.repository';
import { Injectable } from '@nestjs/common';

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
    const savedMessageEntity = await this.repository.save(messageEntity);
    return this.messageMapper.toDomain(savedMessageEntity);
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
