import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { GenerateImageToolHandler } from './generate-image-tool.handler';
import { GenerateImageTool } from '../../domain/tools/generate-image-tool.entity';
import { ToolExecutionFailedError } from '../tools.errors';
import { GetPermittedImageGenerationModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-image-generation-model/get-permitted-image-generation-model.use-case';
import { GenerateImageUseCase } from 'src/domain/models/application/use-cases/generate-image/generate-image.use-case';
import { SaveGeneratedImageUseCase } from 'src/domain/threads/application/use-cases/save-generated-image/save-generated-image.use-case';
import { CollectUsageAsyncService } from 'src/domain/usage/application/services/collect-usage-async.service';
import { ContextService } from 'src/common/context/services/context.service';
import { PermittedImageGenerationModel } from 'src/domain/models/domain/permitted-model.entity';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ImageGenerationResult } from 'src/domain/models/application/ports/image-generation.handler';
import { CheckQuotaUseCase } from 'src/iam/quotas/application/use-cases/check-quota/check-quota.use-case';
import { QuotaType } from 'src/iam/quotas/domain/quota-type.enum';
import { QuotaExceededError } from 'src/iam/quotas/application/quotas.errors';

describe('GenerateImageToolHandler', () => {
  let handler: GenerateImageToolHandler;
  let mockGetPermittedModel: jest.Mocked<GetPermittedImageGenerationModelUseCase>;
  let mockGenerateImage: jest.Mocked<GenerateImageUseCase>;
  let mockSaveGeneratedImage: jest.Mocked<SaveGeneratedImageUseCase>;
  let mockCollectUsage: jest.Mocked<CollectUsageAsyncService>;
  let mockContextService: jest.Mocked<ContextService>;
  let mockCheckQuota: jest.Mocked<CheckQuotaUseCase>;

  const mockOrgId = randomUUID();
  const mockThreadId = randomUUID();
  const mockUserId = randomUUID();
  const mockImageId = randomUUID();

  beforeEach(async () => {
    mockGetPermittedModel = { execute: jest.fn() } as any;
    mockGenerateImage = { execute: jest.fn() } as any;
    mockSaveGeneratedImage = { execute: jest.fn() } as any;
    mockCollectUsage = { collect: jest.fn() } as any;
    mockContextService = { get: jest.fn() } as any;
    mockCheckQuota = { execute: jest.fn().mockResolvedValue(undefined) } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerateImageToolHandler,
        {
          provide: GetPermittedImageGenerationModelUseCase,
          useValue: mockGetPermittedModel,
        },
        {
          provide: GenerateImageUseCase,
          useValue: mockGenerateImage,
        },
        {
          provide: SaveGeneratedImageUseCase,
          useValue: mockSaveGeneratedImage,
        },
        {
          provide: CollectUsageAsyncService,
          useValue: mockCollectUsage,
        },
        {
          provide: ContextService,
          useValue: mockContextService,
        },
        {
          provide: CheckQuotaUseCase,
          useValue: mockCheckQuota,
        },
      ],
    }).compile();

    handler = module.get<GenerateImageToolHandler>(GenerateImageToolHandler);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function setupHappyPath(): void {
    const model = new ImageGenerationModel({
      id: randomUUID(),
      name: 'dall-e-3',
      provider: ModelProvider.AZURE,
      displayName: 'DALL-E 3',
      isArchived: false,
    });

    mockGetPermittedModel.execute.mockResolvedValue(
      new PermittedImageGenerationModel({
        model,
        orgId: mockOrgId,
      }),
    );

    mockGenerateImage.execute.mockResolvedValue(
      new ImageGenerationResult(Buffer.from('fake-image-data'), 'image/png'),
    );

    mockSaveGeneratedImage.execute.mockResolvedValue({ id: mockImageId });
    mockContextService.get.mockReturnValue(mockUserId);
  }

  it('should return the generated image ID as a plain string', async () => {
    setupHappyPath();

    const result = await handler.execute({
      tool: new GenerateImageTool(),
      input: { prompt: 'A sunset over the Alps' },
      context: { orgId: mockOrgId, threadId: mockThreadId, isAnonymous: false },
    });

    expect(result).toBe(mockImageId);
  });

  it('should pass the prompt to GenerateImageUseCase', async () => {
    setupHappyPath();

    await handler.execute({
      tool: new GenerateImageTool(),
      input: { prompt: 'A cat wearing a hat' },
      context: { orgId: mockOrgId, threadId: mockThreadId },
    });

    const command = mockGenerateImage.execute.mock.calls[0][0];
    expect(command.prompt).toBe('A cat wearing a hat');
  });

  it('should pass correct params to SaveGeneratedImageUseCase', async () => {
    setupHappyPath();

    await handler.execute({
      tool: new GenerateImageTool(),
      input: { prompt: 'A mountain landscape' },
      context: {
        orgId: mockOrgId,
        threadId: mockThreadId,
        isAnonymous: true,
      },
    });

    const command = mockSaveGeneratedImage.execute.mock.calls[0][0];
    expect(command.orgId).toBe(mockOrgId);
    expect(command.userId).toBe(mockUserId);
    expect(command.threadId).toBe(mockThreadId);
    expect(command.imageData).toEqual(Buffer.from('fake-image-data'));
    expect(command.contentType).toBe('image/png');
    expect(command.isAnonymous).toBe(true);
  });

  it('should default isAnonymous to false when not provided in context', async () => {
    setupHappyPath();

    await handler.execute({
      tool: new GenerateImageTool(),
      input: { prompt: 'A tree' },
      context: { orgId: mockOrgId, threadId: mockThreadId },
    });

    const command = mockSaveGeneratedImage.execute.mock.calls[0][0];
    expect(command.isAnonymous).toBe(false);
  });

  it('should throw ToolExecutionFailedError when permitted model not found', async () => {
    mockGetPermittedModel.execute.mockRejectedValue(
      new Error('No permitted image generation model found'),
    );

    await expect(
      handler.execute({
        tool: new GenerateImageTool(),
        input: { prompt: 'A sunset' },
        context: { orgId: mockOrgId, threadId: mockThreadId },
      }),
    ).rejects.toThrow(ToolExecutionFailedError);
  });

  it('should throw ToolExecutionFailedError when image generation fails', async () => {
    setupHappyPath();
    mockGenerateImage.execute.mockRejectedValue(
      new Error('Content policy violation'),
    );

    await expect(
      handler.execute({
        tool: new GenerateImageTool(),
        input: { prompt: 'Invalid content' },
        context: { orgId: mockOrgId, threadId: mockThreadId },
      }),
    ).rejects.toThrow(ToolExecutionFailedError);
  });

  it('should throw ToolExecutionFailedError when save fails', async () => {
    setupHappyPath();
    mockSaveGeneratedImage.execute.mockRejectedValue(
      new Error('Storage unavailable'),
    );

    await expect(
      handler.execute({
        tool: new GenerateImageTool(),
        input: { prompt: 'A valid image' },
        context: { orgId: mockOrgId, threadId: mockThreadId },
      }),
    ).rejects.toThrow(ToolExecutionFailedError);
  });

  it('should throw ToolExecutionFailedError when userId is not in context', async () => {
    setupHappyPath();
    mockContextService.get.mockReturnValue(undefined);

    await expect(
      handler.execute({
        tool: new GenerateImageTool(),
        input: { prompt: 'A sunset' },
        context: { orgId: mockOrgId, threadId: mockThreadId },
      }),
    ).rejects.toThrow(ToolExecutionFailedError);
  });

  it('should throw ToolExecutionFailedError when input validation fails', async () => {
    await expect(
      handler.execute({
        tool: new GenerateImageTool(),
        input: {},
        context: { orgId: mockOrgId, threadId: mockThreadId },
      }),
    ).rejects.toThrow(ToolExecutionFailedError);
  });

  it('should collect token usage when the handler returns it', async () => {
    const model = new ImageGenerationModel({
      id: randomUUID(),
      name: 'gpt-image-1',
      provider: ModelProvider.AZURE,
      displayName: 'GPT Image 1',
      isArchived: false,
      inputTokenCost: 5,
      outputTokenCost: 40,
    });

    mockGetPermittedModel.execute.mockResolvedValue(
      new PermittedImageGenerationModel({ model, orgId: mockOrgId }),
    );
    mockGenerateImage.execute.mockResolvedValue(
      new ImageGenerationResult(
        Buffer.from('fake-image-data'),
        'image/png',
        undefined,
        { inputTokens: 120, outputTokens: 4096, totalTokens: 4216 },
      ),
    );
    mockSaveGeneratedImage.execute.mockResolvedValue({ id: mockImageId });
    mockContextService.get.mockReturnValue(mockUserId);

    await handler.execute({
      tool: new GenerateImageTool(),
      input: { prompt: 'A cyberpunk skyline' },
      context: { orgId: mockOrgId, threadId: mockThreadId },
    });

    expect(mockCollectUsage.collect).toHaveBeenCalledWith(model, 120, 4096);
  });

  it('should not collect usage when the handler returns no token counts', async () => {
    setupHappyPath();

    await handler.execute({
      tool: new GenerateImageTool(),
      input: { prompt: 'A sunset' },
      context: { orgId: mockOrgId, threadId: mockThreadId },
    });

    expect(mockCollectUsage.collect).not.toHaveBeenCalled();
  });

  it('should not collect usage when saving the generated image fails', async () => {
    const model = new ImageGenerationModel({
      id: randomUUID(),
      name: 'gpt-image-1',
      provider: ModelProvider.AZURE,
      displayName: 'GPT Image 1',
      isArchived: false,
      inputTokenCost: 5,
      outputTokenCost: 40,
    });

    mockGetPermittedModel.execute.mockResolvedValue(
      new PermittedImageGenerationModel({ model, orgId: mockOrgId }),
    );
    mockGenerateImage.execute.mockResolvedValue(
      new ImageGenerationResult(
        Buffer.from('fake-image-data'),
        'image/png',
        undefined,
        { inputTokens: 120, outputTokens: 4096, totalTokens: 4216 },
      ),
    );
    mockSaveGeneratedImage.execute.mockRejectedValue(
      new Error('Storage unavailable'),
    );
    mockContextService.get.mockReturnValue(mockUserId);

    await expect(
      handler.execute({
        tool: new GenerateImageTool(),
        input: { prompt: 'A cyberpunk skyline' },
        context: { orgId: mockOrgId, threadId: mockThreadId },
      }),
    ).rejects.toThrow(ToolExecutionFailedError);

    expect(mockCollectUsage.collect).not.toHaveBeenCalled();
  });

  it('should check the FAIR_USE_IMAGES quota for the current user', async () => {
    setupHappyPath();

    await handler.execute({
      tool: new GenerateImageTool(),
      input: { prompt: 'A castle' },
      context: { orgId: mockOrgId, threadId: mockThreadId },
    });

    expect(mockCheckQuota.execute).toHaveBeenCalledTimes(1);
    const query = mockCheckQuota.execute.mock.calls[0][0];
    expect(query.userId).toBe(mockUserId);
    expect(query.quotaType).toBe(QuotaType.FAIR_USE_IMAGES);
  });

  it('should propagate QuotaExceededError without calling the image provider or save', async () => {
    setupHappyPath();
    mockCheckQuota.execute.mockRejectedValue(
      new QuotaExceededError(QuotaType.FAIR_USE_IMAGES, 50, 86_400_000, 3600),
    );

    await expect(
      handler.execute({
        tool: new GenerateImageTool(),
        input: { prompt: 'A castle' },
        context: { orgId: mockOrgId, threadId: mockThreadId },
      }),
    ).rejects.toThrow(QuotaExceededError);

    expect(mockGenerateImage.execute).not.toHaveBeenCalled();
    expect(mockSaveGeneratedImage.execute).not.toHaveBeenCalled();
    expect(mockCollectUsage.collect).not.toHaveBeenCalled();
  });

  it('should resolve the permitted model before checking the quota', async () => {
    setupHappyPath();

    await handler.execute({
      tool: new GenerateImageTool(),
      input: { prompt: 'A castle' },
      context: { orgId: mockOrgId, threadId: mockThreadId },
    });

    const permittedOrder =
      mockGetPermittedModel.execute.mock.invocationCallOrder[0];
    const quotaOrder = mockCheckQuota.execute.mock.invocationCallOrder[0];
    const generateOrder = mockGenerateImage.execute.mock.invocationCallOrder[0];

    expect(permittedOrder).toBeLessThan(quotaOrder);
    expect(quotaOrder).toBeLessThan(generateOrder);
  });
});
