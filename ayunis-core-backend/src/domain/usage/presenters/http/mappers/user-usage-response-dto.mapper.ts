import { Injectable } from '@nestjs/common';
import { UserUsageItem } from '../../../domain/user-usage-item.entity';
import { ModelBreakdownItem } from '../../../domain/model-breakdown-item.entity';
import { Paginated } from 'src/common/pagination';
import {
  UserUsageResponseDto,
  UserUsageDto,
  ModelBreakdownDto,
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
      cost: user.cost,
      lastActivity: user.lastActivity,
      isActive: user.isActive,
      modelBreakdown: user.modelBreakdown.map((model) =>
        this.toModelBreakdownDto(model),
      ),
    };
  }

  private toModelBreakdownDto(model: ModelBreakdownItem): ModelBreakdownDto {
    return {
      modelId: model.modelId,
      modelName: model.modelName,
      displayName: model.displayName,
      provider: model.provider,
      tokens: model.tokens,
      requests: model.requests,
      cost: model.cost,
      percentage: model.percentage || 0,
    };
  }
}
