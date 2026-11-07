/** `now` is passed in so a sweep decides everything against one instant. */
export class SweepDueRoutinesCommand {
  constructor(public readonly now: Date) {}
}
