import type { UUID } from 'crypto';

export class UpdateBrandingCommand {
  readonly orgId: UUID;
  // null = clear (fall back to platform default), undefined = leave unchanged
  readonly displayName?: string | null;
  readonly faviconBuffer?: Buffer;
  readonly faviconMimeType?: string;
  readonly removeFavicon: boolean;
  readonly primaryColor?: string;
  readonly resetPrimaryColor: boolean;

  constructor(params: {
    orgId: UUID;
    displayName?: string | null;
    faviconBuffer?: Buffer;
    faviconMimeType?: string;
    removeFavicon?: boolean;
    primaryColor?: string;
    resetPrimaryColor?: boolean;
  }) {
    this.orgId = params.orgId;
    this.displayName = params.displayName;
    this.faviconBuffer = params.faviconBuffer;
    this.faviconMimeType = params.faviconMimeType;
    this.removeFavicon = params.removeFavicon ?? false;
    this.primaryColor = params.primaryColor;
    this.resetPrimaryColor = params.resetPrimaryColor ?? false;
  }
}
