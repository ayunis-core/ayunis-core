import { ChildEntity } from 'typeorm';
import { ArtifactRecord } from './artifact.record';
import { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';

@ChildEntity(ArtifactType.DIAGRAM)
export class DiagramArtifactRecord extends ArtifactRecord {}
