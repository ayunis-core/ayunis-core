import { ChildEntity } from 'typeorm';
import { ArtifactRecord } from './artifact.record';
import { ArtifactType } from '../../../../domain/value-objects/artifact-type.enum';

@ChildEntity(ArtifactType.DIAGRAM)
export class DiagramArtifactRecord extends ArtifactRecord {}
