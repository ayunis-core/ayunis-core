export class RegisterUserCommand {
  public readonly userName: string;
  public readonly email: string;
  public readonly password: string;
  public readonly orgName: string;

  constructor({
    userName,
    email,
    password,
    orgName,
  }: {
    userName: string;
    email: string;
    password: string;
    orgName: string;
  }) {
    this.userName = userName;
    this.email = email;
    this.password = password;
    this.orgName = orgName;
  }
}
