export class SendEmailCommand {
  public readonly to: string | string[];
  public readonly cc?: string[];
  public readonly bcc?: string[];
  public readonly subject: string;
  public readonly html?: string;
  public readonly text: string;

  constructor(params: {
    to: string | string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    html?: string;
    text: string;
  }) {
    this.to = params.to;
    this.cc = params.cc;
    this.bcc = params.bcc;
    this.subject = params.subject;
    this.html = params.html;
    this.text = params.text;
  }
}
