import { randomUUID } from 'crypto';
import type { Repository } from 'typeorm';
import { MessageThreadMissingError } from 'src/domain/messages/application/messages.errors';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import type { MessageMapper } from './mappers/message.mapper';
import type { MessageRecord } from './schema/message.record';
import { LocalMessagesRepository } from './local-messages.repository';

const MESSAGES_THREAD_FOREIGN_KEY = 'FK_15f9bd2bf472ff12b6ee20012d0';

describe('LocalMessagesRepository', () => {
  let persistenceRepository: jest.Mocked<
    Pick<Repository<MessageRecord>, 'save'>
  >;
  let messageMapper: jest.Mocked<Pick<MessageMapper, 'toRecord' | 'toDomain'>>;
  let repository: LocalMessagesRepository;

  beforeEach(() => {
    persistenceRepository = { save: jest.fn() };
    messageMapper = {
      toRecord: jest.fn(),
      toDomain: jest.fn(),
    };
    repository = new LocalMessagesRepository(
      persistenceRepository as unknown as Repository<MessageRecord>,
      messageMapper,
    );
  });

  it('reports when the message parent thread disappeared', async () => {
    const message = new AssistantMessage({
      threadId: randomUUID(),
      content: [],
    });
    messageMapper.toRecord.mockReturnValue({} as MessageRecord);
    persistenceRepository.save.mockRejectedValue(
      Object.assign(new Error('insert violates foreign key constraint'), {
        driverError: {
          code: '23503',
          constraint: MESSAGES_THREAD_FOREIGN_KEY,
        },
      }),
    );

    await expect(repository.create(message)).rejects.toBeInstanceOf(
      MessageThreadMissingError,
    );
  });

  it('keeps unrelated foreign-key failures visible', async () => {
    const message = new AssistantMessage({
      threadId: randomUUID(),
      content: [],
    });
    const unrelatedError = Object.assign(
      new Error('insert violates foreign key constraint'),
      {
        code: '23503',
        constraint: 'FK_unexpected_message_relation',
      },
    );
    messageMapper.toRecord.mockReturnValue({} as MessageRecord);
    persistenceRepository.save.mockRejectedValue(unrelatedError);

    await expect(repository.create(message)).rejects.toBe(unrelatedError);
  });
});
