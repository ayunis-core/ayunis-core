import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { DocumentFontFamily } from './value-objects/document-typography';
import type { PageMargins } from './value-objects/page-margins';
import { createPageMargins } from './value-objects/page-margins';

export class Letterhead {
  public readonly id: UUID;
  public readonly orgId: UUID;
  public readonly name: string;
  public readonly description: string | null;
  public readonly fontFamily: DocumentFontFamily | null;
  public readonly fontSizePt: number | null;
  public readonly firstPageStoragePath: string;
  public readonly continuationPageStoragePath: string | null;
  public readonly firstPageMargins: PageMargins;
  public readonly continuationPageMargins: PageMargins;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(params: {
    id?: UUID;
    orgId: UUID;
    name: string;
    description?: string | null;
    fontFamily?: DocumentFontFamily | null;
    fontSizePt?: number | null;
    firstPageStoragePath: string;
    continuationPageStoragePath?: string | null;
    firstPageMargins: PageMargins;
    continuationPageMargins: PageMargins;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.orgId = params.orgId;
    this.name = params.name;
    this.fontFamily = params.fontFamily ?? null;
    this.fontSizePt = params.fontSizePt ?? null;
    this.description = params.description ?? null;
    this.firstPageStoragePath = params.firstPageStoragePath;
    this.continuationPageStoragePath =
      params.continuationPageStoragePath ?? null;
    this.firstPageMargins = createPageMargins(params.firstPageMargins);
    this.continuationPageMargins = createPageMargins(
      params.continuationPageMargins,
    );
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
