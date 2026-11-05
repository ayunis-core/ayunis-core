export class SearchWebCommand {
  constructor(
    public readonly query: string,
    public readonly signal?: AbortSignal,
  ) {}
}
