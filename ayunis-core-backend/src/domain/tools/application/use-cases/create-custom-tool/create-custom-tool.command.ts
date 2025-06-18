export class CreateCustomToolCommand {
  constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly parameters: Record<string, any>,
  ) {}
}
