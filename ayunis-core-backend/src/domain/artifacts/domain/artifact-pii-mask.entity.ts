import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import type { PiiMask } from 'src/common/anonymization/domain/pii-mask';
import { formatPiiToken } from 'src/common/anonymization/domain/pii-mask';

/**
 * One entry of an anonymous artifact's own mask dictionary: the real value
 * behind a `{{pii:CATEGORY_n}}` placeholder in the artifact's content. It is
 * independent of any chat's dictionary, so it keeps resolving after the chat
 * that wrote the value is gone.
 */
export class ArtifactPiiMask {
  readonly id: UUID;
  readonly artifactId: UUID;
  readonly category: PiiCategory;
  readonly maskIndex: number;
  readonly value: string;
  readonly createdAt: Date;

  constructor(params: {
    id?: UUID;
    artifactId: UUID;
    category: PiiCategory;
    maskIndex: number;
    value: string;
    createdAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.artifactId = params.artifactId;
    this.category = params.category;
    this.maskIndex = params.maskIndex;
    this.value = params.value;
    this.createdAt = params.createdAt ?? new Date();
  }

  get token(): string {
    return formatPiiToken(this);
  }

  toPiiMask(): PiiMask {
    return {
      category: this.category,
      maskIndex: this.maskIndex,
      value: this.value,
    };
  }

  static fromPiiMask(artifactId: UUID, mask: PiiMask): ArtifactPiiMask {
    return new ArtifactPiiMask({
      artifactId,
      category: mask.category,
      maskIndex: mask.maskIndex,
      value: mask.value,
    });
  }
}
