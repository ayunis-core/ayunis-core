import { Injectable } from '@nestjs/common';
import { GlobalUserUsageItem } from '../../../domain/global-user-usage-item.entity';
import {
  GlobalUserUsageResponseDto,
  GlobalUserUsageDto,
} from '../dto/global-user-usage-response.dto';

@Injectable()
export class GlobalUserUsageResponseDtoMapper {
  toDto(items: GlobalUserUsageItem[]): GlobalUserUsageResponseDto {
    return {
      data: items.map((item) => this.toItemDto(item)),
    };
  }

  private toItemDto(item: GlobalUserUsageItem): GlobalUserUsageDto {
    return {
      userId: item.userId,
      userName: item.userName,
      userEmail: item.userEmail,
      tokens: item.tokens,
      requests: item.requests,
      lastActivity: item.lastActivity,
      isActive: item.isActive,
      organizationName: item.organizationName,
    };
  }
}
