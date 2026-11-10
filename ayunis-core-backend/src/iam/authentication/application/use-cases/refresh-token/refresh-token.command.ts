export class RefreshTokenCommand {
  constructor(
    public readonly refreshToken: string,
    /** Body refresh of a token client: the session must carry a client. */
    public readonly clientBound: boolean = false,
  ) {}
}
