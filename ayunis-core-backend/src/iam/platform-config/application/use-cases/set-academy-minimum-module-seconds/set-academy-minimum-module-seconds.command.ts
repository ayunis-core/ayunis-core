export class SetAcademyMinimumModuleSecondsCommand {
  readonly seconds: number;

  constructor(params: { seconds: number }) {
    this.seconds = params.seconds;
  }
}
