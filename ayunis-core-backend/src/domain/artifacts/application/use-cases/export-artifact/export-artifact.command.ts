import { UUID } from 'crypto';

export type ExportFormat = 'docx' | 'pdf';

export class ExportArtifactCommand {
  readonly artifactId: UUID;
  readonly format: ExportFormat;

  constructor(params: { artifactId: UUID; format: ExportFormat }) {
    this.artifactId = params.artifactId;
    this.format = params.format;
  }
}
