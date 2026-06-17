export class SetCreditsPerEuroCommand {
  readonly creditsPerEuro: number;

  constructor(params: { creditsPerEuro: number }) {
    this.creditsPerEuro = params.creditsPerEuro;
  }
}
