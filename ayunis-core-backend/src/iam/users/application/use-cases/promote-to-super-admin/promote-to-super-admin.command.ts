export class PromoteToSuperAdminCommand {
  public readonly email: string;

  constructor(params: { email: string }) {
    this.email = params.email;
  }
}
