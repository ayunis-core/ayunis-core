import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateOrgUseCase } from './create-org.use-case';
import { CreateOrgCommand } from './create-org.command';
import { OrgsRepository } from '../../ports/orgs.repository';
import { Org } from 'src/iam/orgs/domain/org.entity';
import { OrgCreationFailedError } from '../../orgs.errors';
import { OrgCreatedEvent } from '../../events/org-created.event';
import type { UUID } from 'crypto';

describe('CreateOrgUseCase', () => {
  let useCase: CreateOrgUseCase;
  let mockOrgsRepository: Partial<OrgsRepository>;
  let eventEmitter: jest.Mocked<Pick<EventEmitter2, 'emitAsync'>>;

  beforeAll(async () => {
    mockOrgsRepository = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOrgUseCase,
        { provide: OrgsRepository, useValue: mockOrgsRepository },
        {
          provide: EventEmitter2,
          useValue: { emitAsync: jest.fn().mockResolvedValue([]) },
        },
      ],
    }).compile();

    useCase = module.get<CreateOrgUseCase>(CreateOrgUseCase);
    eventEmitter = module.get(EventEmitter2);
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should create organization successfully', async () => {
    const command = new CreateOrgCommand('Test Organization');
    const mockOrg = new Org({
      id: 'org-id' as UUID,
      name: 'Test Organization',
    });

    jest.spyOn(mockOrgsRepository, 'create').mockResolvedValue(mockOrg);

    const result = await useCase.execute(command);

    expect(result).toBe(mockOrg);
    expect(mockOrgsRepository.create).toHaveBeenCalledWith(expect.any(Org));
    expect(mockOrgsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Test Organization' }),
    );
  });

  it('should emit OrgCreatedEvent after creation', async () => {
    const command = new CreateOrgCommand('Test Organization');
    const mockOrg = new Org({
      id: 'org-id' as UUID,
      name: 'Test Organization',
    });

    jest.spyOn(mockOrgsRepository, 'create').mockResolvedValue(mockOrg);

    await useCase.execute(command);

    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      OrgCreatedEvent.EVENT_NAME,
      expect.objectContaining({ orgId: 'org-id', org: mockOrg }),
    );
    // OrgCreatedEvent must not carry a user — that's what user.created is for.
    const orgCreatedCall = (
      eventEmitter.emitAsync as jest.Mock
    ).mock.calls.find(
      ([eventName]: [string]) => eventName === OrgCreatedEvent.EVENT_NAME,
    );
    expect(orgCreatedCall?.[1]).not.toHaveProperty('user');
  });

  it('should throw OrgCreationFailedError for empty name', async () => {
    const command = new CreateOrgCommand('');

    await expect(useCase.execute(command)).rejects.toThrow(
      OrgCreationFailedError,
    );
    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
  });

  it('should throw OrgCreationFailedError for whitespace-only name', async () => {
    const command = new CreateOrgCommand('   ');

    await expect(useCase.execute(command)).rejects.toThrow(
      OrgCreationFailedError,
    );
  });

  it('should throw OrgCreationFailedError for unexpected errors', async () => {
    const command = new CreateOrgCommand('Test Organization');

    jest
      .spyOn(mockOrgsRepository, 'create')
      .mockRejectedValue(new Error('Database error'));

    await expect(useCase.execute(command)).rejects.toThrow(
      OrgCreationFailedError,
    );
    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
  });
});
