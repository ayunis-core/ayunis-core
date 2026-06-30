export class SetAppAlertCommand {
  readonly enabled: boolean;
  readonly message: string;

  constructor(params: { enabled: boolean; message: string }) {
    this.enabled = params.enabled;
    this.message = params.message;
  }
}
