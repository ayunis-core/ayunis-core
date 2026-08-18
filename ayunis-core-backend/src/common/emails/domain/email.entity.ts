export class Email {
  public readonly to: string | string[];
  public readonly cc?: string[];
  public readonly bcc?: string[];
  public readonly subject: string;
  public readonly text: string;
  public readonly html?: string;

  constructor(params: {
    to: string | string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    text: string;
    html?: string;
  }) {
    this.to = params.to;
    this.cc = params.cc;
    this.bcc = params.bcc;
    this.subject = params.subject;
    this.text = params.text;
    this.html = params.html;
  }
}
