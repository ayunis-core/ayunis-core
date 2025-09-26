export class CreateDataSourceCommand {}

export class CreateCSVDataSourceCommand extends CreateDataSourceCommand {
  public readonly data: { headers: string[]; rows: string[][] };
  public readonly name: string;

  constructor(params: {
    name: string;
    data: { headers: string[]; rows: string[][] };
  }) {
    super();
    this.data = params.data;
    this.name = params.name;
  }
}
