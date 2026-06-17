import { Injectable } from '@nestjs/common';
import { UserUsageItem } from '../../../domain/user-usage-item.entity';
import type { UserUsageResult } from '../../../application/ports/usage.repository';
import {
  UserUsageResponseDto,
  UserUsageDto,
} from '../dto/user-usage-response.dto';

@Injectable()
export class UserUsageResponseDtoMapper {
  toDto(result: UserUsageResult): UserUsageResponseDto {
    return {
      data: result.users.data.map((user) => this.toUserDto(user)),
      pagination: {
        limit: result.users.limit,
        offset: result.users.offset,
        total: result.users.total,
      },
      totalCredits: result.totalCredits,
    };
  }

  private toUserDto(user: UserUsageItem): UserUsageDto {
    return {
      userId: user.userId,
      userName: user.userName,
      userEmail: user.userEmail,
      credits: user.credits,
      requests: user.requests,
      lastActivity: user.lastActivity,
      isActive: user.isActive,
    };
  }
}
