export class AcceptInviteCommand {
  public readonly inviteToken: string;
  public readonly userName: string;
  public readonly password: string;
  public readonly passwordConfirm: string;

  constructor(params: {
    inviteToken: string;
    userName: string;
    password: string;
    passwordConfirm: string;
  }) {
    this.inviteToken = params.inviteToken;
    this.userName = params.userName;
    this.password = params.password;
    this.passwordConfirm = params.passwordConfirm;
  }
}
