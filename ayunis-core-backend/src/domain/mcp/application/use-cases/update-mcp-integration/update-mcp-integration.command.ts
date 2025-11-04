export class UpdateMcpIntegrationCommand {
  constructor(
    public readonly integrationId: string,
    public readonly name?: string,
  ) {}
}
