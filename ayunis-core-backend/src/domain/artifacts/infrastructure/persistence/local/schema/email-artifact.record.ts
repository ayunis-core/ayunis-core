import { ChildEntity } from 'typeorm';
import { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';
import { ArtifactRecord } from './artifact.record';

@ChildEntity(ArtifactType.EMAIL)
export class EmailArtifactRecord extends ArtifactRecord {}
