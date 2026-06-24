export class CreateChapterCommand {
  public readonly title: string;
  public readonly description: string;

  constructor(params: { title: string; description: string }) {
    this.title = params.title;
    this.description = params.description;
  }
}
