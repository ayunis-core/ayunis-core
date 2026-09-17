export class ReservePersonalCreditsCommand {
  constructor(
    public readonly requestedCredits: number,
    public readonly minimumCredits: number,
  ) {}
}
