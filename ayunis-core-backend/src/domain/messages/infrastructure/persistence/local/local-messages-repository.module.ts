import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageRecord } from './schema/message.record';
import { LocalMessagesRepository } from './local-messages.repository';
import { MessageMapper } from './mappers/message.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([MessageRecord])],
  providers: [LocalMessagesRepository, MessageMapper],
  exports: [LocalMessagesRepository, MessageMapper],
})
export class LocalMessagesRepositoryModule {}
