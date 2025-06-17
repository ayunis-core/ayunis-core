import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { ToolsService } from '../src/domain/tools/application/tools.service';
import { ToolConfigRepository } from '../src/domain/tools/application/ports/tool-config.repository';
import { ToolHandlerRegistry } from '../src/domain/tools/application/tool-handler.registry';
import { ToolType } from '../src/domain/tools/domain/value-objects/tool-type.enum';
import { ToolFactory } from '../src/domain/tools/application/tool.factory';
import { FindOneConfigurableToolQuery } from '../src/domain/tools/application/queries/find-one-tool.query';
import { ConfigurableTool } from '../src/domain/tools/domain/configurable-tool.entity';
import {
  HttpToolConfig,
  HttpToolMethod,
} from '../src/domain/tools/domain/tools/http-tool.entity';

describe('Tools Repository', () => {
  let toolsService: ToolsService;
  let toolRepository: {
    create: jest.Mock;
    findOne: jest.Mock;
    findMany: jest.Mock;
    findAll: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  const userId = randomUUID();

  beforeEach(async () => {
    // Create mock repository
    toolRepository = {
      create: jest.fn(),
      findOne: jest.fn(),
      findMany: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ToolsService,
        {
          provide: ToolConfigRepository,
          useValue: toolRepository,
        },
        {
          provide: ToolHandlerRegistry,
          useValue: {
            getHandler: jest.fn(),
          },
        },
        {
          provide: ToolFactory,
          useClass: ToolFactory,
        },
      ],
    }).compile();

    toolsService = moduleRef.get<ToolsService>(ToolsService);
  });

  it('should find tools by ownerId', async () => {
    // Mock data - create proper HttpToolConfig objects
    const mockTools = [
      new HttpToolConfig({
        id: randomUUID(),
        displayName: 'Tool 1',
        description: 'Test tool 1',
        userId: userId,
        endpointUrl: 'https://api.example.com',
        method: HttpToolMethod.GET,
      }),
      new HttpToolConfig({
        id: randomUUID(),
        displayName: 'Tool 2',
        description: 'Test tool 2',
        userId: userId,
        endpointUrl: 'https://api.example2.com',
        method: HttpToolMethod.POST,
      }),
    ];

    // Configure mock
    toolRepository.findAll.mockResolvedValue(mockTools);

    // Call service
    const result = await toolsService.findAllUser({ userId });

    // Verify
    expect(toolRepository.findAll).toHaveBeenCalledWith(userId);
    expect(result).toHaveLength(2);
    expect(result[0]).toBeInstanceOf(ConfigurableTool);
    expect((result[0] as any).config.displayName).toBe('Tool 1');
    expect(result[1]).toBeInstanceOf(ConfigurableTool);
    expect((result[1] as any).config.displayName).toBe('Tool 2');
  });

  it('should find a tool by id and ownerId', async () => {
    // Mock data - create proper HttpToolConfig object
    const toolId = randomUUID();
    const mockTool = new HttpToolConfig({
      id: toolId,
      displayName: 'Test Tool',
      description: 'Test tool description',
      userId: userId,
      endpointUrl: 'https://api.example.com',
      method: HttpToolMethod.GET,
    });

    // Configure mock
    toolRepository.findOne.mockResolvedValue(mockTool);

    // Call service with proper query object
    const query = new FindOneConfigurableToolQuery({
      type: ToolType.HTTP,
      configId: toolId,
      userId: userId,
    });
    const result = await toolsService.findOne(query);

    // Verify
    expect(toolRepository.findOne).toHaveBeenCalledWith(toolId, userId);
    expect(result).toBeInstanceOf(ConfigurableTool);
    expect((result as any).config.id).toBe(toolId);
    expect((result as any).config.displayName).toBe('Test Tool');
  });

  it('should find many tools by ids and ownerId', async () => {
    // Mock data - create proper HttpToolConfig objects
    const toolIds = [randomUUID(), randomUUID()];
    const mockTools = [
      new HttpToolConfig({
        id: toolIds[0],
        displayName: 'Tool 1',
        description: 'Test tool 1',
        userId: userId,
        endpointUrl: 'https://api.example.com',
        method: HttpToolMethod.GET,
      }),
      new HttpToolConfig({
        id: toolIds[1],
        displayName: 'Tool 2',
        description: 'Test tool 2',
        userId: userId,
        endpointUrl: 'https://api.example2.com',
        method: HttpToolMethod.POST,
      }),
    ];

    // Configure mock
    toolRepository.findMany.mockResolvedValue(mockTools);

    // Call service
    const result = await toolsService.findMany(toolIds, userId);

    // Verify
    expect(toolRepository.findMany).toHaveBeenCalledWith(toolIds, userId);
    expect(result).toHaveLength(2);
    expect(result[0]).toBeInstanceOf(ConfigurableTool);
    expect((result[0] as any).config.id).toBe(toolIds[0]);
    expect(result[1]).toBeInstanceOf(ConfigurableTool);
    expect((result[1] as any).config.id).toBe(toolIds[1]);
  });
});
