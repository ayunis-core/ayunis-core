import type { UUID } from 'crypto';

export type ExportFormat = 'docx' | 'pdf' | 'xlsx' | 'csv';

export class ExportArtifactCommand {
  readonly artifactId: UUID;
  readonly format: ExportFormat;

  constructor(params: { artifactId: UUID; format: ExportFormat }) {
    this.artifactId = params.artifactId;
    this.format = params.format;
  }
}
