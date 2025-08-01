export class CreateUrlSourceCommand {
  url: string;

  constructor(params: { url: string }) {
    this.url = params.url;
  }
}
