export class AnonymizeTextCommand {
  constructor(
    public readonly text: string,
    public readonly entities?: string[],
  ) {}
}
