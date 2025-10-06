export class CreateDataSourceCommand {}

export class CreateCSVDataSourceCommand extends CreateDataSourceCommand {
  public readonly data: { headers: string[]; rows: string[][] };
  public readonly name: string;
  public readonly createdByLLM: boolean;

  constructor(params: {
    name: string;
    data: { headers: string[]; rows: string[][] };
    createdByLLM?: boolean;
  }) {
    super();
    this.data = params.data;
    this.name = params.name;
    this.createdByLLM = params.createdByLLM ?? false;
  }
}
