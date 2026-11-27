import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from 'src/domain/storage/storage.module';
import { PlatformConfigModule } from 'src/iam/platform-config/platform-config.module';
import { AdventCalendarDoorsRepository } from './application/ports/advent-calendar-doors.repository';
import { AdventCalendarAccessService } from './application/services/advent-calendar-access.service';
import { AdventCalendarClock } from './application/services/advent-calendar-clock.service';
import { AdventCalendarImageService } from './application/services/advent-calendar-image.service';
import { ClearAdventCalendarDoorUseCase } from './application/use-cases/clear-advent-calendar-door/clear-advent-calendar-door.use-case';
import { DownloadAdventCalendarDoorImageUseCase } from './application/use-cases/download-advent-calendar-door-image/download-advent-calendar-door-image.use-case';
import { GetAdventCalendarUseCase } from './application/use-cases/get-advent-calendar/get-advent-calendar.use-case';
import { GetAdventCalendarManagementUseCase } from './application/use-cases/get-advent-calendar-management/get-advent-calendar-management.use-case';
import { RemoveAdventCalendarDoorImageUseCase } from './application/use-cases/remove-advent-calendar-door-image/remove-advent-calendar-door-image.use-case';
import { SaveAdventCalendarDoorUseCase } from './application/use-cases/save-advent-calendar-door/save-advent-calendar-door.use-case';
import { UploadAdventCalendarDoorImageUseCase } from './application/use-cases/upload-advent-calendar-door-image/upload-advent-calendar-door-image.use-case';
import { LocalAdventCalendarDoorsRepository } from './infrastructure/persistence/local/local-advent-calendar-doors.repository';
import { AdventCalendarDoorRecord } from './infrastructure/persistence/local/schema/advent-calendar-door.record';
import { AdventCalendarController } from './presenters/http/advent-calendar.controller';
import { AdventCalendarDtoMapper } from './presenters/http/mappers/advent-calendar-dto.mapper';
import { SuperAdminAdventCalendarController } from './presenters/http/super-admin-advent-calendar.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdventCalendarDoorRecord]),
    PlatformConfigModule,
    StorageModule,
  ],
  controllers: [AdventCalendarController, SuperAdminAdventCalendarController],
  providers: [
    {
      provide: AdventCalendarDoorsRepository,
      useClass: LocalAdventCalendarDoorsRepository,
    },
    AdventCalendarClock,
    AdventCalendarAccessService,
    AdventCalendarImageService,
    GetAdventCalendarUseCase,
    DownloadAdventCalendarDoorImageUseCase,
    GetAdventCalendarManagementUseCase,
    SaveAdventCalendarDoorUseCase,
    UploadAdventCalendarDoorImageUseCase,
    RemoveAdventCalendarDoorImageUseCase,
    ClearAdventCalendarDoorUseCase,
    AdventCalendarDtoMapper,
  ],
})
export class AdventCalendarModule {}
