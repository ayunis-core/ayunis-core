export class InstallMarketplaceIntegrationCommand {
  constructor(
    public readonly identifier: string,
    public readonly orgConfigValues: Record<string, string>,
    public readonly returnsPii?: boolean,
  ) {}
}
