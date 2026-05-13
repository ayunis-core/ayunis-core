import type { UUID } from 'crypto';

export class UpdateBrandingCommand {
  readonly orgId: UUID;
  // null = clear (fall back to platform default), undefined = leave unchanged
  readonly displayName?: string | null;
  readonly faviconBuffer?: Buffer;
  readonly faviconMimeType?: string;
  readonly removeFavicon: boolean;

  constructor(params: {
    orgId: UUID;
    displayName?: string | null;
    faviconBuffer?: Buffer;
    faviconMimeType?: string;
    removeFavicon?: boolean;
  }) {
    this.orgId = params.orgId;
    this.displayName = params.displayName;
    this.faviconBuffer = params.faviconBuffer;
    this.faviconMimeType = params.faviconMimeType;
    this.removeFavicon = params.removeFavicon ?? false;
  }
}
