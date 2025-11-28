import { Agent } from './agent.entity';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { UUID } from 'crypto';

describe('Agent Entity', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockOrgId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const mockModelId = '123e4567-e89b-12d3-a456-426614174002' as UUID;

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
      }),
    });

  describe('constructor', () => {
    it('should create an agent with mcpIntegrationIds parameter', () => {
      // Arrange
      const mcpIntegrationIds = [
        '123e4567-e89b-12d3-a456-426614174010' as UUID,
        '123e4567-e89b-12d3-a456-426614174011' as UUID,
      ];

      // Act
      const agent = new Agent({
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: createMockModel(),
        userId: mockUserId,
        mcpIntegrationIds,
      });

      // Assert
      expect(agent.mcpIntegrationIds).toEqual(mcpIntegrationIds);
      expect(agent.mcpIntegrationIds).toHaveLength(2);
    });

    it('should default to empty array if mcpIntegrationIds not provided', () => {
      // Act
      const agent = new Agent({
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: createMockModel(),
        userId: mockUserId,
      });

      // Assert
      expect(agent.mcpIntegrationIds).toEqual([]);
      expect(agent.mcpIntegrationIds).toHaveLength(0);
    });

    it('should accept empty array for mcpIntegrationIds', () => {
      // Act
      const agent = new Agent({
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: createMockModel(),
        userId: mockUserId,
        mcpIntegrationIds: [],
      });

      // Assert
      expect(agent.mcpIntegrationIds).toEqual([]);
      expect(agent.mcpIntegrationIds).toHaveLength(0);
    });

    it('should create agent with single mcpIntegrationId', () => {
      // Arrange
      const mcpIntegrationIds = [
        '123e4567-e89b-12d3-a456-426614174010' as UUID,
      ];

      // Act
      const agent = new Agent({
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: createMockModel(),
        userId: mockUserId,
        mcpIntegrationIds,
      });

      // Assert
      expect(agent.mcpIntegrationIds).toEqual(mcpIntegrationIds);
      expect(agent.mcpIntegrationIds).toHaveLength(1);
    });

    it('should make mcpIntegrationIds readonly at type level', () => {
      // Arrange
      const agent = new Agent({
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: createMockModel(),
        userId: mockUserId,
        mcpIntegrationIds: ['123e4567-e89b-12d3-a456-426614174010' as UUID],
      });

      // Assert
      // This test verifies that mcpIntegrationIds is defined and accessible
      // The readonly nature is enforced at compile time by TypeScript
      expect(agent.mcpIntegrationIds).toBeDefined();
      expect(Array.isArray(agent.mcpIntegrationIds)).toBe(true);
    });
  });
});
