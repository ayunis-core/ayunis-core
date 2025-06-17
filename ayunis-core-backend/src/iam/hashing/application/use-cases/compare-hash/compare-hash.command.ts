export class CompareHashCommand {
  constructor(
    public readonly plainText: string,
    public readonly hash: string,
  ) {}
}
