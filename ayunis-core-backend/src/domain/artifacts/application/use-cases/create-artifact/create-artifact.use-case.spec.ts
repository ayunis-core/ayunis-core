jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (target: any, propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { Test, TestingModule } from '@nestjs/testing';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { UUID } from 'crypto';
import { CreateArtifactUseCase } from './create-artifact.use-case';
import { CreateArtifactCommand } from './create-artifact.command';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { AuthorType } from '../../../domain/value-objects/author-type.enum';
import { ContextService } from 'src/common/context/services/context.service';

describe('CreateArtifactUseCase', () => {
  let useCase: CreateArtifactUseCase;
  let artifactsRepository: jest.Mocked<ArtifactsRepository>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockThreadId = '223e4567-e89b-12d3-a456-426614174000' as UUID;

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByThreadId: jest.fn(),
      findByIdWithVersions: jest.fn(),
      addVersion: jest.fn(),
      updateCurrentVersionNumber: jest.fn(),
      delete: jest.fn(),
    };

    const mockContextService = {
      get: jest.fn((key: string) => {
        if (key === 'userId') return mockUserId;
        return undefined;
      }),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateArtifactUseCase,
        { provide: ArtifactsRepository, useValue: mockRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<CreateArtifactUseCase>(CreateArtifactUseCase);
    artifactsRepository = module.get(ArtifactsRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create an artifact with version 1', async () => {
    const command = new CreateArtifactCommand({
      threadId: mockThreadId,
      title: 'Quarterly Budget Report',
      content: '<h1>Budget Report</h1><p>Q1 2026 expenses...</p>',
      authorType: AuthorType.ASSISTANT,
    });

    artifactsRepository.create.mockImplementation(async (artifact) => artifact);
    artifactsRepository.addVersion.mockImplementation(
      async (version) => version,
    );

    const result = await useCase.execute(command);

    expect(result.title).toBe('Quarterly Budget Report');
    expect(result.threadId).toBe(mockThreadId);
    expect(result.userId).toBe(mockUserId);
    expect(result.currentVersionNumber).toBe(1);
    expect(result.versions).toHaveLength(1);
    expect(result.versions[0].versionNumber).toBe(1);
    expect(result.versions[0].content).toBe(
      '<h1>Budget Report</h1><p>Q1 2026 expenses...</p>',
    );
    expect(result.versions[0].authorType).toBe(AuthorType.ASSISTANT);
  });

  it('should set authorId to userId when author type is USER', async () => {
    const command = new CreateArtifactCommand({
      threadId: mockThreadId,
      title: 'Meeting Notes',
      content: '<p>Notes from standup</p>',
      authorType: AuthorType.USER,
    });

    artifactsRepository.create.mockImplementation(async (artifact) => artifact);
    artifactsRepository.addVersion.mockImplementation(
      async (version) => version,
    );

    const result = await useCase.execute(command);

    expect(result.versions[0].authorId).toBe(mockUserId);
  });

  it('should set authorId to null when author type is ASSISTANT', async () => {
    const command = new CreateArtifactCommand({
      threadId: mockThreadId,
      title: 'Generated Summary',
      content: '<p>AI-generated summary</p>',
      authorType: AuthorType.ASSISTANT,
    });

    artifactsRepository.create.mockImplementation(async (artifact) => artifact);
    artifactsRepository.addVersion.mockImplementation(
      async (version) => version,
    );

    const result = await useCase.execute(command);

    expect(result.versions[0].authorId).toBeNull();
  });

  it('should throw UnauthorizedException when user is not authenticated', async () => {
    const mockContextService = {
      get: jest.fn(() => undefined),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateArtifactUseCase,
        { provide: ArtifactsRepository, useValue: artifactsRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    const useCaseNoAuth = module.get<CreateArtifactUseCase>(
      CreateArtifactUseCase,
    );

    const command = new CreateArtifactCommand({
      threadId: mockThreadId,
      title: 'Unauthorized Document',
      content: '<p>Should not be created</p>',
      authorType: AuthorType.USER,
    });

    await expect(useCaseNoAuth.execute(command)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should persist the artifact before adding the version', async () => {
    const callOrder: string[] = [];

    artifactsRepository.create.mockImplementation(async (artifact) => {
      callOrder.push('create');
      return artifact;
    });
    artifactsRepository.addVersion.mockImplementation(async (version) => {
      callOrder.push('addVersion');
      return version;
    });

    const command = new CreateArtifactCommand({
      threadId: mockThreadId,
      title: 'Execution Order Test',
      content: '<p>Content</p>',
      authorType: AuthorType.ASSISTANT,
    });

    await useCase.execute(command);

    expect(callOrder).toEqual(['create', 'addVersion']);
  });
});
