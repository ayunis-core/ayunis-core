import {
  CSVDataSource,
  DataSource,
} from 'src/domain/sources/domain/sources/data-source.entity';
import { SourceRepository } from '../../ports/source.repository';
import {
  CreateDataSourceCommand,
  CreateCSVDataSourceCommand,
} from './create-data-source.command';
import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  InvalidSourceTypeError,
  UnexpectedSourceError,
} from '../../sources.errors';

@Injectable()
export class CreateDataSourceUseCase {
  private readonly logger = new Logger(CreateDataSourceUseCase.name);
  constructor(private readonly sourceRepository: SourceRepository) {}

  // No overload signatures: the typed decorator cannot be applied to an
  // overloaded method (TS1241 on the descriptor).
  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(command: CreateDataSourceCommand): Promise<DataSource> {
    this.logger.log('execute', {
      name:
        command instanceof CreateCSVDataSourceCommand
          ? command.name
          : undefined,
      rowCount:
        command instanceof CreateCSVDataSourceCommand
          ? command.data.rows.length
          : undefined,
    });
    if (command instanceof CreateCSVDataSourceCommand) {
      const dataSource = new CSVDataSource({
        name: command.name,
        data: command.data,
        createdBy: command.createdBy,
      });
      await this.sourceRepository.save(dataSource);
      return dataSource;
    }
    throw new InvalidSourceTypeError(command.constructor.name);
  }
}
