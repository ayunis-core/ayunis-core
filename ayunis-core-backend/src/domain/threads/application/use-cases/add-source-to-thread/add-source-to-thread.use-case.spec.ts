import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID, UUID } from 'crypto';
import { AddSourceToThreadUseCase } from './add-source-to-thread.use-case';
import { AddSourceCommand } from './add-source.command';
import { ThreadsRepository } from '../../ports/threads.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { Thread } from '../../../domain/thread.entity';
import { SourceAssignment } from '../../../domain/thread-source-assignment.entity';
import { SourceType } from 'src/domain/sources/domain/source-type.enum';
import { Source } from 'src/domain/sources/domain/source.entity';
import { SourceAlreadyAssignedError } from '../../threads.errors';

class ConcreteSource extends Source {
  constructor(params: { id?: UUID; name: string }) {
    super({
      id: params.id,
      type: SourceType.TEXT,
      name: params.name,
    });
  }
}

describe('AddSourceToThreadUseCase', () => {
  let useCase: AddSourceToThreadUseCase;
  let threadsRepository: jest.Mocked<ThreadsRepository>;

  const mockUserId = randomUUID();
  const mockOrgId = randomUUID();

  beforeEach(async () => {
    const mockThreadsRepository = {
      updateSourceAssignments: jest.fn(),
    };

    const mockContextService = {
      get: jest.fn((key: string) => {
        if (key === 'userId') return mockUserId;
        if (key === 'orgId') return mockOrgId;
        return undefined;
      }),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddSourceToThreadUseCase,
        { provide: ThreadsRepository, useValue: mockThreadsRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<AddSourceToThreadUseCase>(AddSourceToThreadUseCase);
    threadsRepository = module.get(ThreadsRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should add a source to the thread without originSkillId', async () => {
    const thread = new Thread({
      userId: mockUserId,
      messages: [],
      sourceAssignments: [],
    });
    const source = new ConcreteSource({ name: 'Budget Report 2026.pdf' });
    const command = new AddSourceCommand(thread, source);

    await useCase.execute(command);

    expect(threadsRepository.updateSourceAssignments).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: thread.id,
        userId: mockUserId,
      }),
    );

    const savedAssignments =
      threadsRepository.updateSourceAssignments.mock.calls[0][0]
        .sourceAssignments;
    expect(savedAssignments).toHaveLength(1);
    expect(savedAssignments[0].source.id).toBe(source.id);
    expect(savedAssignments[0].originSkillId).toBeUndefined();
  });

  it('should propagate originSkillId to the created SourceAssignment', async () => {
    const skillId = randomUUID();
    const thread = new Thread({
      userId: mockUserId,
      messages: [],
      sourceAssignments: [],
    });
    const source = new ConcreteSource({
      name: 'Municipal Zoning Guidelines.pdf',
    });
    const command = new AddSourceCommand(thread, source, skillId);

    await useCase.execute(command);

    const savedAssignments =
      threadsRepository.updateSourceAssignments.mock.calls[0][0]
        .sourceAssignments;
    expect(savedAssignments).toHaveLength(1);
    expect(savedAssignments[0]).toBeInstanceOf(SourceAssignment);
    expect(savedAssignments[0].source.id).toBe(source.id);
    expect(savedAssignments[0].originSkillId).toBe(skillId);
  });

  it('should throw SourceAlreadyAssignedError when source is already on the thread', async () => {
    const source = new ConcreteSource({ name: 'Annual Report.pdf' });
    const existingAssignment = new SourceAssignment({ source });
    const thread = new Thread({
      userId: mockUserId,
      messages: [],
      sourceAssignments: [existingAssignment],
    });
    const command = new AddSourceCommand(thread, source);

    await expect(useCase.execute(command)).rejects.toThrow(
      SourceAlreadyAssignedError,
    );
    expect(threadsRepository.updateSourceAssignments).not.toHaveBeenCalled();
  });
});
