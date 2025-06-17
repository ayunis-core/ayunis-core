export class ValidateUserQuery {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {}
}
