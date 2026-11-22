export class SaveMicrosoft365ConnectorCommand {
  readonly tenantId: string;
  readonly clientId: string;
  /** `undefined` keeps the stored secret. */
  readonly clientSecret?: string;

  constructor(params: {
    tenantId: string;
    clientId: string;
    clientSecret?: string;
  }) {
    this.tenantId = params.tenantId;
    this.clientId = params.clientId;
    this.clientSecret = params.clientSecret;
  }
}
