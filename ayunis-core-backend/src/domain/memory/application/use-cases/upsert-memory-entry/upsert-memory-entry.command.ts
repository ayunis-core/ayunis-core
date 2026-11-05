export class UpsertMemoryEntryCommand {
  constructor(
    public readonly key: string,
    public readonly content: string,
  ) {}
}
