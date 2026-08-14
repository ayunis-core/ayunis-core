export class CompleteSsoAuthenticationCommand {
  constructor(
    readonly callbackParameters: URLSearchParams,
    readonly browserBinding: string | undefined,
  ) {}
}
