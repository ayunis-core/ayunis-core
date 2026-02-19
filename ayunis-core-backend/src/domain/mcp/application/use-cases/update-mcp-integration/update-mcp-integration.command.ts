interface UpdateMcpIntegrationParams {
  integrationId: string;
  name?: string;
  credentials?: string;
  authHeaderName?: string;
  returnsPii?: boolean;
  orgConfigValues?: Record<string, string>;
}

export class UpdateMcpIntegrationCommand {
  public readonly integrationId: string;
  public readonly name?: string;
  public readonly credentials?: string;
  public readonly authHeaderName?: string;
  public readonly returnsPii?: boolean;
  public readonly orgConfigValues?: Record<string, string>;

  constructor(params: UpdateMcpIntegrationParams) {
    this.integrationId = params.integrationId;
    this.name = params.name;
    this.credentials = params.credentials;
    this.authHeaderName = params.authHeaderName;
    this.returnsPii = params.returnsPii;
    this.orgConfigValues = params.orgConfigValues;
  }
}
