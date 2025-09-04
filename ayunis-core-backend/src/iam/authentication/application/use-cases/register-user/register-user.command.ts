export class RegisterUserCommand {
  public readonly userName: string;
  public readonly email: string;
  public readonly password: string;
  public readonly orgName: string;
  public readonly hasAcceptedMarketing: boolean;

  constructor({
    userName,
    email,
    password,
    orgName,
    hasAcceptedMarketing,
  }: {
    userName: string;
    email: string;
    password: string;
    orgName: string;
    hasAcceptedMarketing: boolean;
  }) {
    this.userName = userName;
    this.email = email;
    this.password = password;
    this.orgName = orgName;
    this.hasAcceptedMarketing = hasAcceptedMarketing;
  }
}
