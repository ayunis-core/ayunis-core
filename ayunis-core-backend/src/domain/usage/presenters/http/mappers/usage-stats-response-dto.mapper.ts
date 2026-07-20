import { Injectable } from '@nestjs/common';
import { UsageStats } from 'src/domain/usage/domain/usage-stats.entity';
import { UsageStatsResponseDto } from '../dto/usage-stats-response.dto';

@Injectable()
export class UsageStatsResponseDtoMapper {
  toDto(usageStats: UsageStats): UsageStatsResponseDto {
    return {
      totalCredits: usageStats.totalCredits,
      totalRequests: usageStats.totalRequests,
      activeUsers: usageStats.activeUsers,
      totalUsers: usageStats.totalUsers,
      topModels: usageStats.topModels,
    };
  }
}
