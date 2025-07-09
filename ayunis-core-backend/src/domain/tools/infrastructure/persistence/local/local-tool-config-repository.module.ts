import { TypeOrmModule } from '@nestjs/typeorm';
import { ToolConfigRecord } from './schema/tool-config.record';
import { ToolConfigMapper } from './mappers/tool-config.mapper';
import { Module } from '@nestjs/common';
import { LocalToolConfigRepository } from './local-tool-config.repository';

@Module({
  imports: [TypeOrmModule.forFeature([ToolConfigRecord])],
  providers: [ToolConfigMapper, LocalToolConfigRepository],
  exports: [ToolConfigMapper, LocalToolConfigRepository],
})
export class LocalToolConfigRepositoryModule {}
