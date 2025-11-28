export class UpdateMcpIntegrationCommand {
  constructor(
    public readonly integrationId: string,
    public readonly name?: string,
    public readonly credentials?: string,
    public readonly authHeaderName?: string,
    public readonly returnsPii?: boolean,
  ) {}
}
