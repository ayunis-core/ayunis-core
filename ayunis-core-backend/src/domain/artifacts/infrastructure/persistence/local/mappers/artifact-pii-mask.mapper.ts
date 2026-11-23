import { ArtifactPiiMask } from 'src/domain/artifacts/domain/artifact-pii-mask.entity';
import type { ArtifactPiiMaskRecord } from 'src/domain/artifacts/infrastructure/persistence/local/schema/artifact-pii-mask.record';

export class ArtifactPiiMaskMapper {
  static toDomain(record: ArtifactPiiMaskRecord): ArtifactPiiMask {
    return new ArtifactPiiMask({
      id: record.id,
      artifactId: record.artifactId,
      category: record.category,
      maskIndex: record.maskIndex,
      value: record.value,
      createdAt: record.createdAt,
    });
  }
}
