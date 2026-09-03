import type { UUID } from 'crypto';
import {
  createLoggerMock,
  type LoggerMock,
} from 'src/common/testing/logger.mock';
import {
  EffectiveImageGenerationModelConflictError,
  PermittedImageGenerationModelNotFoundForOrgError,
} from 'src/domain/models/application/models.errors';
import type { GetPermittedImageGenerationModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-image-generation-model/get-permitted-image-generation-model.use-case';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import type { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { assembleImageGenerationTools } from './image-generation-tool-assembly.helper';

describe(assembleImageGenerationTools.name, () => {
  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
  let getImageModel: jest.Mocked<GetPermittedImageGenerationModelUseCase>;
  let assembleTool: jest.Mocked<AssembleToolUseCase>;
  let logger: LoggerMock;

  beforeEach(() => {
    getImageModel = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetPermittedImageGenerationModelUseCase>;
    assembleTool = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AssembleToolUseCase>;
    logger = createLoggerMock();
  });

  const execute = (): Promise<Tool[]> =>
    assembleImageGenerationTools({
      orgId,
      getPermittedImageGenerationModelUseCase: getImageModel,
      assembleToolsUseCase: assembleTool,
      logger,
    });

  it('omits the image tool when no effective image model is available', async () => {
    getImageModel.execute.mockRejectedValue(
      new PermittedImageGenerationModelNotFoundForOrgError(orgId),
    );

    await expect(execute()).resolves.toEqual([]);
    expect(assembleTool.execute).not.toHaveBeenCalled();
  });

  it('logs and omits the image tool when enabled teams conflict', async () => {
    getImageModel.execute.mockRejectedValue(
      new EffectiveImageGenerationModelConflictError(orgId, [
        '22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333333',
      ]),
    );

    await expect(execute()).resolves.toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      { orgId },
      'Conflicting team image-generation grants; dropping generate_image tool',
    );
    expect(assembleTool.execute).not.toHaveBeenCalled();
  });

  it('still propagates unrelated image policy failures', async () => {
    getImageModel.execute.mockRejectedValue(new Error('database unavailable'));

    await expect(execute()).rejects.toThrow('database unavailable');
  });
});
