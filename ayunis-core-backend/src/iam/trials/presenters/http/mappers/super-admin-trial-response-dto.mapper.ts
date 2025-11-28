import { Injectable } from '@nestjs/common';
import { Trial } from '../../../domain/trial.entity';
import { SuperAdminTrialResponseDto } from '../dtos/super-admin-trial-response.dto';

@Injectable()
export class SuperAdminTrialResponseDtoMapper {
  toDto(trial: Trial): SuperAdminTrialResponseDto {
    return {
      id: trial.id,
      orgId: trial.orgId,
      messagesSent: trial.messagesSent,
      maxMessages: trial.maxMessages,
      createdAt: trial.createdAt,
      updatedAt: trial.updatedAt,
    };
  }
}
