import { Injectable } from '@nestjs/common';
import { UserUsageItem } from '../../../domain/user-usage-item.entity';
import { Paginated } from 'src/common/pagination';
import {
  UserUsageResponseDto,
  UserUsageDto,
} from '../dto/user-usage-response.dto';

@Injectable()
export class UserUsageResponseDtoMapper {
  toDto(userUsageResult: Paginated<UserUsageItem>): UserUsageResponseDto {
    return {
      data: userUsageResult.data.map((user) => this.toUserDto(user)),
      pagination: {
        limit: userUsageResult.limit,
        offset: userUsageResult.offset,
        total: userUsageResult.total,
      },
    };
  }

  private toUserDto(user: UserUsageItem): UserUsageDto {
    return {
      userId: user.userId,
      userName: user.userName,
      userEmail: user.userEmail,
      tokens: user.tokens,
      requests: user.requests,
      lastActivity: user.lastActivity,
      isActive: user.isActive,
    };
  }
}
