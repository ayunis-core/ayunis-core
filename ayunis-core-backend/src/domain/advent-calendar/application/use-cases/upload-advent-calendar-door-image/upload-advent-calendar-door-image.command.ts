export class UploadAdventCalendarDoorImageCommand {
  constructor(
    public readonly day: number,
    public readonly data: Buffer,
  ) {}
}
