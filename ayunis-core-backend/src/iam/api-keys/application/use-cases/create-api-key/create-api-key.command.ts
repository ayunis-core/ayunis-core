export class CreateApiKeyCommand {
  constructor(
    public readonly name: string,
    public readonly expiresAt: Date | null,
  ) {}
}
