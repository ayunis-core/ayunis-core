import { ChildEntity } from 'typeorm';
import { ArtifactRecord } from './artifact.record';
import { ArtifactType } from '../../../../domain/value-objects/artifact-type.enum';

@ChildEntity(ArtifactType.JSX)
export class JsxArtifactRecord extends ArtifactRecord {}
