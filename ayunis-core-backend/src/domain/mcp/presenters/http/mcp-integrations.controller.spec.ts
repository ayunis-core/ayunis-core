import { Test, TestingModule } from '@nestjs/testing';
import { McpIntegrationsController } from './mcp-integrations.controller';
import { McpIntegrationDtoMapper } from './mappers/mcp-integration-dto.mapper';
import { CreateMcpIntegrationUseCase } from '../../application/use-cases/create-mcp-integration/create-mcp-integration.use-case';
import { GetMcpIntegrationUseCase } from '../../application/use-cases/get-mcp-integration/get-mcp-integration.use-case';
import { ListOrgMcpIntegrationsUseCase } from '../../application/use-cases/list-org-mcp-integrations/list-org-mcp-integrations.use-case';
import { UpdateMcpIntegrationUseCase } from '../../application/use-cases/update-mcp-integration/update-mcp-integration.use-case';
import { DeleteMcpIntegrationUseCase } from '../../application/use-cases/delete-mcp-integration/delete-mcp-integration.use-case';
import { EnableMcpIntegrationUseCase } from '../../application/use-cases/enable-mcp-integration/enable-mcp-integration.use-case';
import { DisableMcpIntegrationUseCase } from '../../application/use-cases/disable-mcp-integration/disable-mcp-integration.use-case';
import { ValidateMcpIntegrationUseCase } from '../../application/use-cases/validate-mcp-integration/validate-mcp-integration.use-case';
import { ListPredefinedMcpIntegrationConfigsUseCase } from '../../application/use-cases/list-predefined-mcp-integration-configs/list-predefined-mcp-integration-configs.use-case';
import {
  PredefinedMcpIntegration,
  CustomMcpIntegration,
} from '../../domain/mcp-integration.entity';
import { PredefinedMcpIntegrationSlug } from '../../domain/value-objects/predefined-mcp-integration-slug.enum';
import { McpAuthMethod } from '../../domain/value-objects/mcp-auth-method.enum';
import { CreatePredefinedIntegrationDto } from './dto/create-predefined-integration.dto';
import { CreateCustomIntegrationDto } from './dto/create-custom-integration.dto';
import { UpdateMcpIntegrationDto } from './dto/update-mcp-integration.dto';

describe('McpIntegrationsController', () => {
  let controller: McpIntegrationsController;
  let createUseCase: jest.Mocked<CreateMcpIntegrationUseCase>;
  let getUseCase: jest.Mocked<GetMcpIntegrationUseCase>;
  let listOrgUseCase: jest.Mocked<ListOrgMcpIntegrationsUseCase>;
  let updateUseCase: jest.Mocked<UpdateMcpIntegrationUseCase>;
  let deleteUseCase: jest.Mocked<DeleteMcpIntegrationUseCase>;
  let enableUseCase: jest.Mocked<EnableMcpIntegrationUseCase>;
  let disableUseCase: jest.Mocked<DisableMcpIntegrationUseCase>;
  let validateUseCase: jest.Mocked<ValidateMcpIntegrationUseCase>;
  let listConfigsUseCase: jest.Mocked<ListPredefinedMcpIntegrationConfigsUseCase>;
  beforeEach(async () => {
    const mockCreateUseCase = {
      execute: jest.fn(),
    };
    const mockGetUseCase = {
      execute: jest.fn(),
    };
    const mockListOrgUseCase = {
      execute: jest.fn(),
    };
    const mockUpdateUseCase = {
      execute: jest.fn(),
    };
    const mockDeleteUseCase = {
      execute: jest.fn(),
    };
    const mockEnableUseCase = {
      execute: jest.fn(),
    };
    const mockDisableUseCase = {
      execute: jest.fn(),
    };
    const mockValidateUseCase = {
      execute: jest.fn(),
    };
    const mockListConfigsUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [McpIntegrationsController],
      providers: [
        McpIntegrationDtoMapper,
        {
          provide: CreateMcpIntegrationUseCase,
          useValue: mockCreateUseCase,
        },
        {
          provide: GetMcpIntegrationUseCase,
          useValue: mockGetUseCase,
        },
        {
          provide: ListOrgMcpIntegrationsUseCase,
          useValue: mockListOrgUseCase,
        },
        {
          provide: UpdateMcpIntegrationUseCase,
          useValue: mockUpdateUseCase,
        },
        {
          provide: DeleteMcpIntegrationUseCase,
          useValue: mockDeleteUseCase,
        },
        {
          provide: EnableMcpIntegrationUseCase,
          useValue: mockEnableUseCase,
        },
        {
          provide: DisableMcpIntegrationUseCase,
          useValue: mockDisableUseCase,
        },
        {
          provide: ValidateMcpIntegrationUseCase,
          useValue: mockValidateUseCase,
        },
        {
          provide: ListPredefinedMcpIntegrationConfigsUseCase,
          useValue: mockListConfigsUseCase,
        },
      ],
    }).compile();

    controller = module.get<McpIntegrationsController>(
      McpIntegrationsController,
    );
    createUseCase = module.get(CreateMcpIntegrationUseCase);
    getUseCase = module.get(GetMcpIntegrationUseCase);
    listOrgUseCase = module.get(ListOrgMcpIntegrationsUseCase);
    updateUseCase = module.get(UpdateMcpIntegrationUseCase);
    deleteUseCase = module.get(DeleteMcpIntegrationUseCase);
    enableUseCase = module.get(EnableMcpIntegrationUseCase);
    disableUseCase = module.get(DisableMcpIntegrationUseCase);
    validateUseCase = module.get(ValidateMcpIntegrationUseCase);
    listConfigsUseCase = module.get(ListPredefinedMcpIntegrationConfigsUseCase);
  });

  describe('createPredefined', () => {
    it('should forward credentials to use case when creating predefined integration', async () => {
      const dto: CreatePredefinedIntegrationDto = {
        name: 'Test Integration',
        slug: PredefinedMcpIntegrationSlug.TEST,
        authMethod: McpAuthMethod.BEARER_TOKEN,
        authHeaderName: 'Authorization',
        credentials: 'plain-text-token',
      };

      const mockIntegration = new PredefinedMcpIntegration({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Integration',
        organizationId: '123e4567-e89b-12d3-a456-426614174001',
        slug: PredefinedMcpIntegrationSlug.TEST,
        enabled: true,
        authMethod: McpAuthMethod.BEARER_TOKEN,
        authHeaderName: 'Authorization',
        encryptedCredentials: 'encrypted-token',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      createUseCase.execute.mockResolvedValue(mockIntegration as any);

      const result = await controller.createPredefined(dto);

      // Verify use case was called with plaintext credentials
      expect(createUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Integration',
          slug: PredefinedMcpIntegrationSlug.TEST,
          authMethod: McpAuthMethod.BEARER_TOKEN,
          authHeaderName: 'Authorization',
          credentials: 'plain-text-token',
        }),
      );

      // Verify response DTO
      expect(result).toEqual(
        expect.objectContaining({
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Integration',
          type: 'predefined',
          hasCredentials: true,
        }),
      );
      expect(result).not.toHaveProperty('credentials');
    });

    it('should handle creation without credentials', async () => {
      const dto: CreatePredefinedIntegrationDto = {
        name: 'Test Integration',
        slug: PredefinedMcpIntegrationSlug.TEST,
      };

      const mockIntegration = new PredefinedMcpIntegration({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Integration',
        organizationId: '123e4567-e89b-12d3-a456-426614174001',
        slug: PredefinedMcpIntegrationSlug.TEST,
        enabled: true,
        authMethod: undefined,
        authHeaderName: undefined,
        encryptedCredentials: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      createUseCase.execute.mockResolvedValue(mockIntegration as any);

      const result = await controller.createPredefined(dto);

      // Verify use case was called with undefined credentials
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(createUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Integration',
          slug: PredefinedMcpIntegrationSlug.TEST,
          credentials: undefined,
        }),
      );

      expect(result.hasCredentials).toBe(false);
    });
  });

  describe('createCustom', () => {
    it('should forward credentials when creating custom integration', async () => {
      const dto: CreateCustomIntegrationDto = {
        name: 'Custom Server',
        serverUrl: 'https://custom.com/mcp',
        authMethod: McpAuthMethod.CUSTOM_HEADER,
        authHeaderName: 'X-API-Key',
        credentials: 'plain-api-key',
      };

      const mockIntegration = new CustomMcpIntegration({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Custom Server',
        organizationId: '123e4567-e89b-12d3-a456-426614174001',
        serverUrl: 'https://custom.com/mcp',
        enabled: true,
        authMethod: McpAuthMethod.CUSTOM_HEADER,
        authHeaderName: 'X-API-Key',
        encryptedCredentials: 'encrypted-api-key',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      createUseCase.execute.mockResolvedValue(mockIntegration);

      const result = await controller.createCustom(dto);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(createUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Custom Server',
          serverUrl: 'https://custom.com/mcp',
          credentials: 'plain-api-key',
        }),
      );
      expect(result.type).toBe('custom');
      expect(result.serverUrl).toBe('https://custom.com/mcp');
    });
  });

  describe('list', () => {
    it('should return all integrations for organization', async () => {
      const mockIntegrations = [
        new PredefinedMcpIntegration({
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Predefined',
          organizationId: 'org-id',
          slug: PredefinedMcpIntegrationSlug.TEST,
          enabled: true,
          authMethod: undefined,
          authHeaderName: undefined,
          encryptedCredentials: undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        new CustomMcpIntegration({
          id: '123e4567-e89b-12d3-a456-426614174002',
          name: 'Custom',
          organizationId: 'org-id',
          serverUrl: 'https://custom.com/mcp',
          enabled: false,
          authMethod: undefined,
          authHeaderName: undefined,
          encryptedCredentials: undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ];

      listOrgUseCase.execute.mockResolvedValue(mockIntegrations);

      const result = await controller.list();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(listOrgUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({}),
      );
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('predefined');
      expect(result[1].type).toBe('custom');
    });
  });

  describe('listPredefinedConfigs', () => {
    it('should return available predefined configs without server URLs', () => {
      const mockConfigs = [
        {
          slug: PredefinedMcpIntegrationSlug.TEST,
          displayName: 'Test MCP Server',
          description: 'Test integration',
          url: 'http://localhost:3100/mcp', // Should not be exposed
          defaultAuthMethod: McpAuthMethod.BEARER_TOKEN,
          defaultAuthHeaderName: 'Authorization',
        },
      ];

      listConfigsUseCase.execute.mockReturnValue(mockConfigs);

      const result = controller.listPredefinedConfigs();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        slug: PredefinedMcpIntegrationSlug.TEST,
        displayName: 'Test MCP Server',
        description: 'Test integration',
        defaultAuthMethod: McpAuthMethod.BEARER_TOKEN,
        defaultAuthHeaderName: 'Authorization',
      });
      expect(result[0]).not.toHaveProperty('url');
    });
  });

  describe('getById', () => {
    it('should get integration by ID', async () => {
      const mockIntegration = new PredefinedMcpIntegration({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test',
        organizationId: 'org-id',
        slug: PredefinedMcpIntegrationSlug.TEST,
        enabled: true,
        authMethod: undefined,
        authHeaderName: undefined,
        encryptedCredentials: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      getUseCase.execute.mockResolvedValue(mockIntegration);

      const result = await controller.getById(
        '123e4567-e89b-12d3-a456-426614174000' as any,
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(getUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationId: '123e4567-e89b-12d3-a456-426614174000',
        }),
      );
      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });
  });

  describe('update', () => {
    it('should delegate update to use case', async () => {
      const dto: UpdateMcpIntegrationDto = {
        name: 'Updated Name',
      };

      const mockIntegration = new PredefinedMcpIntegration({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Updated Name',
        organizationId: 'org-id',
        slug: PredefinedMcpIntegrationSlug.TEST,
        enabled: true,
        authMethod: undefined,
        authHeaderName: undefined,
        encryptedCredentials: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      updateUseCase.execute.mockResolvedValue(mockIntegration);

      await controller.update(
        '123e4567-e89b-12d3-a456-426614174000' as any,
        dto,
      );

      expect(updateUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Updated Name',
        }),
      );
    });
  });

  describe('delete', () => {
    it('should delete integration and return void', async () => {
      deleteUseCase.execute.mockResolvedValue(undefined);

      const result = await controller.delete(
        '123e4567-e89b-12d3-a456-426614174000' as any,
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(deleteUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationId: '123e4567-e89b-12d3-a456-426614174000',
        }),
      );
      expect(result).toBeUndefined();
    });
  });

  describe('enable', () => {
    it('should enable integration', async () => {
      const mockIntegration = new PredefinedMcpIntegration({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test',
        organizationId: 'org-id',
        slug: PredefinedMcpIntegrationSlug.TEST,
        enabled: true,
        authMethod: undefined,
        authHeaderName: undefined,
        encryptedCredentials: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      enableUseCase.execute.mockResolvedValue(mockIntegration);

      const result = await controller.enable(
        '123e4567-e89b-12d3-a456-426614174000' as any,
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(enableUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationId: '123e4567-e89b-12d3-a456-426614174000',
        }),
      );
      expect(result.enabled).toBe(true);
    });
  });

  describe('disable', () => {
    it('should disable integration', async () => {
      const mockIntegration = new PredefinedMcpIntegration({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test',
        organizationId: 'org-id',
        slug: PredefinedMcpIntegrationSlug.TEST,
        enabled: false,
        authMethod: undefined,
        authHeaderName: undefined,
        encryptedCredentials: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      disableUseCase.execute.mockResolvedValue(mockIntegration);

      const result = await controller.disable(
        '123e4567-e89b-12d3-a456-426614174000' as any,
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(disableUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationId: '123e4567-e89b-12d3-a456-426614174000',
        }),
      );
      expect(result.enabled).toBe(false);
    });
  });

  describe('validate', () => {
    it('should validate integration and return capabilities', async () => {
      const mockValidationResult = {
        isValid: true,
        toolCount: 5,
        resourceCount: 3,
        promptCount: 2,
      };

      validateUseCase.execute.mockResolvedValue(mockValidationResult);

      const result = await controller.validate(
        '123e4567-e89b-12d3-a456-426614174000' as any,
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(validateUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationId: '123e4567-e89b-12d3-a456-426614174000',
        }),
      );
      expect(result).toEqual({
        valid: true,
        capabilities: {
          tools: 5,
          resources: 3,
          prompts: 2,
        },
        error: undefined,
      });
    });

    it('should return error message when validation fails', async () => {
      const mockValidationResult = {
        isValid: false,
        errorMessage: 'Connection timeout',
      };

      validateUseCase.execute.mockResolvedValue(mockValidationResult);

      const result = await controller.validate(
        '123e4567-e89b-12d3-a456-426614174000' as any,
      );

      expect(result).toEqual({
        valid: false,
        capabilities: {
          tools: 0,
          resources: 0,
          prompts: 0,
        },
        error: 'Connection timeout',
      });
    });
  });
});
