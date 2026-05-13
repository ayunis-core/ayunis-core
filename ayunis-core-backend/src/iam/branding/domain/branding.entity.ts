import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export interface BrandingParams {
  id?: UUID;
  orgId: UUID;
  displayName?: string | null;
  faviconStoragePath?: string | null;
  primaryColor?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Branding {
  id: UUID;
  orgId: UUID;
  // null = platform default; a missing branding row falls back to the org
  // name in the read path instead.
  displayName: string | null;
  faviconStoragePath: string | null;
  // 6-digit hex; null = platform default theme
  primaryColor: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: BrandingParams) {
    this.id = params.id ?? randomUUID();
    this.orgId = params.orgId;
    this.displayName = params.displayName ?? null;
    this.faviconStoragePath = params.faviconStoragePath ?? null;
    this.primaryColor = params.primaryColor ?? null;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
