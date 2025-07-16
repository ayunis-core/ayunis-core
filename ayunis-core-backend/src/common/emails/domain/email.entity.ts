export class Email {
  constructor(
    public readonly to: string,
    public readonly subject: string,
    public readonly text: string,
  ) {}
}
