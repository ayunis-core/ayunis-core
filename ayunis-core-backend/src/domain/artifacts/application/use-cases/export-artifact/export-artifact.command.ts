import type { UUID } from 'crypto';

export type ExportFormat = 'docx' | 'pdf' | 'xlsx' | 'csv';

export class ExportArtifactCommand {
  readonly artifactId: UUID;
  readonly format: ExportFormat;
  readonly versionNumber?: number;

  constructor(params: {
    artifactId: UUID;
    format: ExportFormat;
    versionNumber?: number;
  }) {
    this.artifactId = params.artifactId;
    this.format = params.format;
    this.versionNumber = params.versionNumber;
  }
}
