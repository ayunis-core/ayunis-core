import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';

export class CreateDataSourceCommand {}

export class CreateCSVDataSourceCommand extends CreateDataSourceCommand {
  public readonly data: { headers: string[]; rows: string[][] };
  public readonly name: string;
  public readonly createdBy: SourceCreator;

  constructor(params: {
    name: string;
    data: { headers: string[]; rows: string[][] };
    createdBy?: SourceCreator;
  }) {
    super();
    this.data = params.data;
    this.name = params.name;
    this.createdBy = params.createdBy ?? SourceCreator.USER;
  }
}
