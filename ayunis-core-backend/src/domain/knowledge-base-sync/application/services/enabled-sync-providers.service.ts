import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FeatureFlag } from 'src/config/features.config';
import { SyncedLocationProvider } from 'src/domain/knowledge-base-sync/domain/synced-location-provider.enum';

/** The feature flag a provider's locations need; `null` for none. */
const PROVIDER_FLAGS: Record<SyncedLocationProvider, FeatureFlag | null> = {
  [SyncedLocationProvider.CONNECTOR]: FeatureFlag.Connectors,
};

/**
 * The providers whose locations are listed, synced, processed and can be
 * added or synced now. A location of a switched-off provider is left as it
 * is: its documents stay searchable as ordinary documents.
 */
@Injectable()
export class EnabledSyncProviders {
  constructor(private readonly configService: ConfigService) {}

  includes(provider: SyncedLocationProvider): boolean {
    const flag = PROVIDER_FLAGS[provider];
    return (
      flag === null ||
      this.configService.get<boolean>(`features.${flag}`) === true
    );
  }

  all(): SyncedLocationProvider[] {
    return Object.values(SyncedLocationProvider).filter((provider) =>
      this.includes(provider),
    );
  }
}
