export class RenderedEmailContent {
  public readonly html?: string;
  public readonly text: string;
  public readonly subject?: string;

  constructor(params: { html?: string; text: string; subject?: string }) {
    this.html = params.html;
    this.text = params.text;
    this.subject = params.subject;
  }
}
