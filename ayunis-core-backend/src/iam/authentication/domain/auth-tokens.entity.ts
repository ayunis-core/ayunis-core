export class AuthTokens {
  constructor(
    public readonly access_token: string,
    public readonly refresh_token: string,
  ) {}
}
