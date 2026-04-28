export class SetImageFairUseLimitCommand {
  readonly limit: number;
  readonly windowMs: number;

  constructor(params: { limit: number; windowMs: number }) {
    this.limit = params.limit;
    this.windowMs = params.windowMs;
  }
}
