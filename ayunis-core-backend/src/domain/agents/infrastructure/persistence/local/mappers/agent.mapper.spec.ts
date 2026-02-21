import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AgentMapper } from './agent.mapper';
import { AgentRecord } from '../schema/agent.record';
import { Agent } from '../../../../domain/agent.entity';
import { PermittedModelMapper } from 'src/domain/models/infrastructure/persistence/local-permitted-models/mappers/permitted-model.mapper';
import { AgentToolMapper } from './agent-tool.mapper';
import { AgentSourceAssignmentMapper } from './agent-source-assignment.mapper';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import type { McpIntegrationRecord } from 'src/domain/mcp/infrastructure/persistence/postgres/schema/mcp-integration.record';
import type { UUID } from 'crypto';

describe('AgentMapper', () => {
  let mapper: AgentMapper;
  let permittedModelMapper: jest.Mocked<PermittedModelMapper>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockOrgId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const mockModelId = '123e4567-e89b-12d3-a456-426614174002' as UUID;
  const mockAgentId = '123e4567-e89b-12d3-a456-426614174003' as UUID;

  const createMockModel = () =>
    new PermittedLanguageModel({
      id: mockModelId,
      orgId: mockOrgId,
      model: new LanguageModel({
        name: 'gpt-4',
        displayName: 'GPT-4',
        provider: ModelProvider.OPENAI,
        canStream: true,
        isReasoning: false,
        isArchived: false,
        canUseTools: true,
        canVision: false,
      }),
    });

  beforeAll(async () => {
    const mockPermittedModelMapper = {
      toDomain: jest.fn(),
      toRecord: jest.fn(),
    };

    const mockAgentToolMapper = {
      toDomain: jest.fn(),
      toRecord: jest.fn(),
    };

    const mockAgentSourceAssignmentMapper = {
      toDomain: jest.fn(),
      toRecord: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentMapper,
        { provide: PermittedModelMapper, useValue: mockPermittedModelMapper },
        { provide: AgentToolMapper, useValue: mockAgentToolMapper },
        {
          provide: AgentSourceAssignmentMapper,
          useValue: mockAgentSourceAssignmentMapper,
        },
      ],
    }).compile();

    mapper = module.get<AgentMapper>(AgentMapper);
    permittedModelMapper = module.get(PermittedModelMapper);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('toDomain', () => {
    it('should correctly map integration IDs from record', () => {
      // Arrange
      const mcpIntegration1 = {
        id: '123e4567-e89b-12d3-a456-426614174010',
      } as unknown as McpIntegrationRecord;
      const mcpIntegration2 = {
        id: '123e4567-e89b-12d3-a456-426614174011',
      } as unknown as McpIntegrationRecord;

      const record = new AgentRecord();
      record.id = mockAgentId;
      record.name = 'Test Agent';
      record.instructions = 'Test instructions';
      record.userId = mockUserId;
      record.mcpIntegrations = [mcpIntegration1, mcpIntegration2];
      record.createdAt = new Date();
      record.updatedAt = new Date();

      permittedModelMapper.toDomain.mockReturnValue(createMockModel() as any);

      // Act
      const result = mapper.toDomain(record);

      // Assert
      expect(result.mcpIntegrationIds).toEqual([
        '123e4567-e89b-12d3-a456-426614174010',
        '123e4567-e89b-12d3-a456-426614174011',
      ]);
      expect(result.mcpIntegrationIds).toHaveLength(2);
    });

    it('should handle empty mcpIntegrations array', () => {
      // Arrange
      const record = new AgentRecord();
      record.id = mockAgentId;
      record.name = 'Test Agent';
      record.instructions = 'Test instructions';
      record.userId = mockUserId;
      record.mcpIntegrations = [];
      record.createdAt = new Date();
      record.updatedAt = new Date();

      permittedModelMapper.toDomain.mockReturnValue(createMockModel() as any);

      // Act
      const result = mapper.toDomain(record);

      // Assert
      expect(result.mcpIntegrationIds).toEqual([]);
      expect(result.mcpIntegrationIds).toHaveLength(0);
    });

    it('should handle null mcpIntegrations', () => {
      // Arrange
      const record = new AgentRecord();
      record.id = mockAgentId;
      record.name = 'Test Agent';
      record.instructions = 'Test instructions';
      record.userId = mockUserId;
      record.mcpIntegrations = undefined;
      record.createdAt = new Date();
      record.updatedAt = new Date();

      permittedModelMapper.toDomain.mockReturnValue(createMockModel() as any);

      // Act
      const result = mapper.toDomain(record);

      // Assert
      expect(result.mcpIntegrationIds).toEqual([]);
      expect(result.mcpIntegrationIds).toHaveLength(0);
    });

    it('should handle single mcpIntegration', () => {
      // Arrange
      const mcpIntegration = {
        id: '123e4567-e89b-12d3-a456-426614174010',
      } as unknown as McpIntegrationRecord;

      const record = new AgentRecord();
      record.id = mockAgentId;
      record.name = 'Test Agent';
      record.instructions = 'Test instructions';
      record.userId = mockUserId;
      record.mcpIntegrations = [mcpIntegration];
      record.createdAt = new Date();
      record.updatedAt = new Date();

      permittedModelMapper.toDomain.mockReturnValue(createMockModel() as any);

      // Act
      const result = mapper.toDomain(record);

      // Assert
      expect(result.mcpIntegrationIds).toEqual([
        '123e4567-e89b-12d3-a456-426614174010',
      ]);
      expect(result.mcpIntegrationIds).toHaveLength(1);
    });
  });

  describe('toRecord', () => {
    it('should map agent to record without modifying mcpIntegrations', () => {
      // Arrange
      const agent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: createMockModel(),
        userId: mockUserId,
        mcpIntegrationIds: [
          '123e4567-e89b-12d3-a456-426614174010',
          '123e4567-e89b-12d3-a456-426614174011',
        ],
      });

      permittedModelMapper.toRecord.mockReturnValue({} as any);

      // Act
      const result = mapper.toRecord(agent);

      // Assert
      expect(result.id).toBe(mockAgentId);
      expect(result.name).toBe('Test Agent');
      expect(result.instructions).toBe('Test instructions');
      expect(result.userId).toBe(mockUserId);
      // mcpIntegrations should not be set in toRecord
      // The relationship is managed by the repository
      expect(result.mcpIntegrations).toBeUndefined();
    });

    it('should handle agent with empty mcpIntegrationIds', () => {
      // Arrange
      const agent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: createMockModel(),
        userId: mockUserId,
        mcpIntegrationIds: [],
      });

      permittedModelMapper.toRecord.mockReturnValue({} as any);

      // Act
      const result = mapper.toRecord(agent);

      // Assert
      expect(result.id).toBe(mockAgentId);
      expect(result.mcpIntegrations).toBeUndefined();
    });
  });
});
