export class RenderedEmailContent {
  public readonly html?: string;
  public readonly text: string;

  constructor(params: { html?: string; text: string }) {
    this.html = params.html;
    this.text = params.text;
  }
}
