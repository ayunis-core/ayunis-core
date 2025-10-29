export class RetrieveMcpResourceCommand {
  public readonly integrationId: string;
  public readonly resourceUri: string;
  public readonly parameters?: Record<string, unknown>;

  constructor(
    integrationId: string,
    resourceUri: string,
    parameters?: Record<string, unknown>,
  ) {
    this.integrationId = integrationId;
    this.resourceUri = resourceUri;
    this.parameters = parameters;
  }
}
