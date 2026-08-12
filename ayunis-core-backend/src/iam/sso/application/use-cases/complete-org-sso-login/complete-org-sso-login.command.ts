export class CompleteOrgSsoLoginCommand {
  constructor(
    readonly callbackParameters: URLSearchParams,
    readonly browserBinding: string | undefined,
  ) {}
}
