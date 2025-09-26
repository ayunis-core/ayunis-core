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
import {
  InvalidSourceTypeError,
  UnexpectedSourceError,
} from '../../sources.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class CreateDataSourceUseCase {
  private readonly logger = new Logger(CreateDataSourceUseCase.name);
  constructor(private readonly sourceRepository: SourceRepository) {}

  async execute(command: CreateCSVDataSourceCommand): Promise<CSVDataSource>;
  async execute(command: CreateDataSourceCommand): Promise<DataSource>;
  async execute(command: CreateDataSourceCommand): Promise<DataSource> {
    this.logger.log('execute', { command });
    try {
      if (command instanceof CreateCSVDataSourceCommand) {
        const dataSource = new CSVDataSource({
          name: command.name,
          data: command.data,
        });
        await this.sourceRepository.save(dataSource);
        return dataSource;
      }
      throw new InvalidSourceTypeError(command.constructor.name);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error creating data source', {
        error: error as Error,
      });
      throw new UnexpectedSourceError('Error creating data source', {
        error: error as Error,
      });
    }
  }
}
