export class SendEmailCommand {
  public readonly to: string;
  public readonly subject: string;
  public readonly html?: string;
  public readonly text: string;

  constructor(params: {
    to: string;
    subject: string;
    html?: string;
    text: string;
  }) {
    this.to = params.to;
    this.subject = params.subject;
    this.html = params.html;
    this.text = params.text;
  }
}
