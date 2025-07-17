export class Email {
  public readonly to: string;
  public readonly subject: string;
  public readonly text: string;
  public readonly html?: string;

  constructor(params: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }) {
    this.to = params.to;
    this.subject = params.subject;
    this.text = params.text;
    this.html = params.html;
  }
}
