import { ChildEntity, Column, Index, ManyToOne } from 'typeorm';
import { UUID } from 'crypto';
import { ArtifactRecord } from './artifact.record';
import { LetterheadRecord } from '../../../../../letterheads/infrastructure/persistence/local/schema/letterhead.record';
import { ArtifactType } from '../../../../domain/value-objects/artifact-type.enum';

@ChildEntity(ArtifactType.DOCUMENT)
export class DocumentArtifactRecord extends ArtifactRecord {
  @Column({ nullable: true })
  @Index()
  letterheadId: UUID | null;

  @ManyToOne(() => LetterheadRecord, { onDelete: 'SET NULL', nullable: true })
  letterhead: LetterheadRecord | null;
}
