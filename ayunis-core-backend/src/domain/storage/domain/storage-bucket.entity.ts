export class StorageBucket {
  readonly name: string;
  readonly creationDate?: Date;
  readonly region?: string;

  constructor(name: string, creationDate?: Date, region?: string) {
    this.name = name;
    this.creationDate = creationDate;
    this.region = region;
  }
}
