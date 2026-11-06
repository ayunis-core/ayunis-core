import { createLoggerMock } from 'src/common/testing/logger.mock';
import {
  EffectiveImageGenerationModelConflictError,
  PermittedImageGenerationModelNotFoundForOrgError,
} from 'src/domain/models/application/models.errors';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import {
  aCapabilityContext,
  createAssembleToolUseCase,
  TEST_ORG_ID,
  toolNames,
} from 'src/domain/runs/testing/run-capability.fixture';
import { ImageGenerationCapability } from './image-generation.capability';

function buildCapability(imageModel: () => Promise<unknown>) {
  const getImageModel = jest.fn(imageModel);
  const capability = new ImageGenerationCapability(
    { execute: getImageModel } as never,
    createAssembleToolUseCase(),
  );
  return { capability, getImageModel };
}

describe('ImageGenerationCapability', () => {
  it('offers generate_image when the user has an effective image model', async () => {
    const { capability } = buildCapability(() => Promise.resolve({}));

    expect(
      toolNames(await capability.contribute(aCapabilityContext())),
    ).toEqual([ToolType.GENERATE_IMAGE]);
  });

  it('omits generate_image when no image model is permitted', async () => {
    const { capability } = buildCapability(() =>
      Promise.reject(
        new PermittedImageGenerationModelNotFoundForOrgError(TEST_ORG_ID),
      ),
    );

    expect(await capability.contribute(aCapabilityContext())).toEqual({});
  });

  it('logs and omits generate_image when enabled teams conflict', async () => {
    const logger = createLoggerMock();
    const { capability } = buildCapability(() =>
      Promise.reject(
        new EffectiveImageGenerationModelConflictError(TEST_ORG_ID, [
          '44444444-4444-4444-8444-444444444444',
          '55555555-5555-4555-8555-555555555555',
        ]),
      ),
    );

    expect(await capability.contribute(aCapabilityContext())).toEqual({});
    expect(logger.warn).toHaveBeenCalledWith(
      { orgId: TEST_ORG_ID },
      'Conflicting team image-generation grants; dropping generate_image tool',
    );
  });

  it('logs and rethrows unrelated image policy failures', async () => {
    const logger = createLoggerMock();
    const { capability } = buildCapability(() =>
      Promise.reject(new Error('Database connection failed')),
    );

    await expect(capability.contribute(aCapabilityContext())).rejects.toThrow(
      'Database connection failed',
    );
    expect(logger.error).toHaveBeenCalledWith(
      { orgId: TEST_ORG_ID, error: 'Database connection failed' },
      'Failed to check image generation model availability',
    );
  });

  it('skips the image model check when the model cannot use tools', async () => {
    const { capability, getImageModel } = buildCapability(() =>
      Promise.resolve({}),
    );

    expect(
      await capability.contribute(aCapabilityContext({ canUseTools: false })),
    ).toEqual({});
    expect(getImageModel).not.toHaveBeenCalled();
  });
});
