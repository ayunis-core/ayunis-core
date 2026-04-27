export class GetPermittedLanguageModelByNameQuery {
  name: string;

  constructor(params: { name: string }) {
    this.name = params.name;
  }
}
