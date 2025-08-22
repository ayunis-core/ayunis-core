import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { GetPermittedModelsUseCase } from './get-permitted-models.use-case';
import { GetPermittedModelsQuery } from './get-permitted-models.query';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';

describe('GetPermittedModelsUseCase', () => {
  let useCase: GetPermittedModelsUseCase;
  let permittedModelsRepository: jest.Mocked<PermittedModelsRepository>;

  const mockOrgId = '123e4567-e89b-12d3-a456-426614174000' as any;

  beforeEach(async () => {
    const mockPermittedModelsRepository = {
      findAll: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findByOrgAndModel: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetPermittedModelsUseCase,
        {
          provide: PermittedModelsRepository,
          useValue: mockPermittedModelsRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetPermittedModelsUseCase>(GetPermittedModelsUseCase);
    permittedModelsRepository = module.get(PermittedModelsRepository);

    // Mock logger
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return permitted models successfully', async () => {
      // Arrange
      const query = new GetPermittedModelsQuery(mockOrgId, undefined);

      const mockPermittedModels = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001' as any,
          model: {
            id: 'model-1' as any,
            name: 'gpt-4',
            provider: 'openai',
          },
          orgId: mockOrgId,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174002' as any,
          model: {
            id: 'model-2' as any,
            name: 'claude-3-sonnet',
            provider: 'anthropic',
          },
          orgId: mockOrgId,
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as PermittedModel[];

      permittedModelsRepository.findAll.mockResolvedValue(mockPermittedModels);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(permittedModelsRepository.findAll).toHaveBeenCalledWith(
        mockOrgId,
        undefined,
      );
      expect(result).toBe(mockPermittedModels);
      expect(result).toHaveLength(2);
    });

    it('should return filtered permitted models', async () => {
      // Arrange
      const filter = { provider: 'openai' } as any;
      const query = new GetPermittedModelsQuery(mockOrgId, filter);

      const mockPermittedModels = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001' as any,
          model: {
            id: 'model-1' as any,
            name: 'gpt-4',
            provider: 'openai',
          },
          orgId: mockOrgId,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as PermittedModel[];

      permittedModelsRepository.findAll.mockResolvedValue(mockPermittedModels);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(permittedModelsRepository.findAll).toHaveBeenCalledWith(
        mockOrgId,
        filter,
      );
      expect(result).toBe(mockPermittedModels);
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no permitted models exist', async () => {
      // Arrange
      const query = new GetPermittedModelsQuery(mockOrgId, undefined);

      permittedModelsRepository.findAll.mockResolvedValue([]);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(permittedModelsRepository.findAll).toHaveBeenCalledWith(
        mockOrgId,
        undefined,
      );
      expect(result).toEqual([]);
    });

    it('should log debug information', async () => {
      // Arrange
      const filter = { type: 'language' } as any;
      const query = new GetPermittedModelsQuery(mockOrgId, filter);

      permittedModelsRepository.findAll.mockResolvedValue([]);

      const debugSpy = jest.spyOn(Logger.prototype, 'debug');

      // Act
      await useCase.execute(query);

      // Assert
      expect(debugSpy).toHaveBeenCalledWith('Getting permitted models', {
        orgId: mockOrgId,
        filter,
      });
    });

    it('should handle repository errors', async () => {
      // Arrange
      const query = new GetPermittedModelsQuery(mockOrgId, undefined);

      const repositoryError = new Error('Database connection failed');
      permittedModelsRepository.findAll.mockRejectedValue(repositoryError);

      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle unknown error types', async () => {
      // Arrange
      const query = new GetPermittedModelsQuery(mockOrgId, undefined);

      permittedModelsRepository.findAll.mockRejectedValue('string error');

      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toBeDefined();
    });
  });
});
