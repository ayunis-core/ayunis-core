import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoutineRecord } from './schema/routine.record';
import { LocalRoutinesRepository } from './local-routines.repository';
import { RoutineMapper } from './mappers/routine.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([RoutineRecord])],
  providers: [LocalRoutinesRepository, RoutineMapper],
  exports: [LocalRoutinesRepository],
})
export class LocalRoutinesRepositoryModule {}
