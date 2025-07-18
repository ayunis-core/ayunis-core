export class SendPasswordResetEmailCommand {
  constructor(
    public readonly userEmail: string,
    public readonly resetToken: string,
    public readonly userName?: string,
  ) {}
}
