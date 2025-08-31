export class GenerateIcsCommand {
  constructor(
    public readonly title: string,
    public readonly startIso: string,
    public readonly endIso: string,
    public readonly description?: string,
    public readonly location?: string,
  ) {}
}
