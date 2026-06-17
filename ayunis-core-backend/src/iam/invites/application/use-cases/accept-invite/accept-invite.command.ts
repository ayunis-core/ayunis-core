export class AcceptInviteCommand {
  public readonly inviteToken: string;
  public readonly userName: string;
  public readonly password: string;
  public readonly hasAcceptedMarketing: boolean;
  public readonly department?: string;

  constructor(params: {
    inviteToken: string;
    userName: string;
    password: string;
    hasAcceptedMarketing: boolean;
    department?: string;
  }) {
    this.inviteToken = params.inviteToken;
    this.userName = params.userName;
    this.password = params.password;
    this.hasAcceptedMarketing = params.hasAcceptedMarketing;
    this.department = params.department;
  }
}
