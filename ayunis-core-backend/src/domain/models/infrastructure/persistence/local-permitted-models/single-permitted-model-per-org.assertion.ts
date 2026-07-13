import type { Logger } from '@nestjs/common';
import type { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import {
  MultipleEmbeddingModelsNotAllowedError,
  MultipleImageGenerationModelsNotAllowedError,
} from 'src/domain/models/application/models.errors';
import type { PermittedModelQueryService } from './permitted-model-query.service';

interface AssertionDeps {
  queryService: PermittedModelQueryService;
  logger: Logger;
}

/**
 * Enforces the single-permitted-model-per-org constraints at the repository
 * write layer:
 * - Embedding: at most one permitted embedding model per org.
 * - Image-generation: at most one *org-scoped* permitted image model per org.
 *   Team-scoped grants reference that same org model and are de-duplicated per
 *   team+model at the application layer, so they are intentionally exempt.
 */
export async function assertSingleModelPerOrg(
  deps: AssertionDeps,
  permittedModel: PermittedModel,
): Promise<void> {
  await assertSingleEmbedding(deps, permittedModel);
  await assertSingleImageGeneration(deps, permittedModel);
}

async function assertSingleEmbedding(
  { queryService, logger }: AssertionDeps,
  permittedModel: PermittedModel,
): Promise<void> {
  if (!(permittedModel.model instanceof EmbeddingModel)) return;
  const existing = await queryService.findOneEmbedding(permittedModel.orgId);
  if (!existing) return;
  const metadata = {
    orgId: permittedModel.orgId,
    existingPermittedEmbeddingModelId: existing.id,
    newModelId: permittedModel.model.id,
  };
  logger.error(
    'Attempt to create a second permitted embedding model for org',
    metadata,
  );
  throw new MultipleEmbeddingModelsNotAllowedError(metadata);
}

async function assertSingleImageGeneration(
  { queryService, logger }: AssertionDeps,
  permittedModel: PermittedModel,
): Promise<void> {
  if (
    !(permittedModel.model instanceof ImageGenerationModel) ||
    permittedModel.scope !== PermittedModelScope.ORG
  ) {
    return;
  }
  const existing = await queryService.findManyImageGeneration(
    permittedModel.orgId,
  );
  if (existing.length === 0) return;
  const metadata = {
    orgId: permittedModel.orgId,
    existingPermittedImageGenerationModelId: existing[0].id,
    newModelId: permittedModel.model.id,
  };
  logger.error(
    'Attempt to create a second permitted image-generation model for org',
    metadata,
  );
  throw new MultipleImageGenerationModelsNotAllowedError(metadata);
}
