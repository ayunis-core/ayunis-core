import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import { ArtifactRecord } from './artifact.record';

@Entity({ name: 'artifact_pii_masks' })
@Unique(['artifactId', 'category', 'maskIndex'])
@Unique(['artifactId', 'category', 'value'])
export class ArtifactPiiMaskRecord extends BaseRecord {
  @Column()
  artifactId: UUID;

  @ManyToOne(() => ArtifactRecord, (artifact) => artifact.piiMasks, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'artifactId' })
  artifact: ArtifactRecord;

  @Column({ type: 'enum', enum: PiiCategory })
  category: PiiCategory;

  @Column({ type: 'int' })
  maskIndex: number;

  @Column({ type: 'text' })
  value: string;
}
