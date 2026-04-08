export class CompleteMcpOAuthAuthorizationCommand {
  constructor(
    public readonly code: string,
    public readonly state: string,
  ) {}
}
