export class RegisterUserCommand {
  public readonly userName: string;
  public readonly email: string;
  public readonly password: string;
  public readonly orgName: string;
  public readonly hasAcceptedMarketing: boolean;
  public readonly department?: string;

  constructor({
    userName,
    email,
    password,
    orgName,
    hasAcceptedMarketing,
    department,
  }: {
    userName: string;
    email: string;
    password: string;
    orgName: string;
    hasAcceptedMarketing: boolean;
    department?: string;
  }) {
    this.userName = userName;
    this.email = email;
    this.password = password;
    this.orgName = orgName;
    this.hasAcceptedMarketing = hasAcceptedMarketing;
    this.department = department;
  }
}
