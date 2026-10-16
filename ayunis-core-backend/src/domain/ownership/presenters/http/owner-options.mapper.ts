import type { OwnerOptions } from 'src/domain/ownership/application/use-cases/list-owner-options/list-owner-options.use-case';
import {
  type OwnerOptionDto,
  OwnerOptionType,
  type OwnerOptionsResponseDto,
} from './dto/ownership.dto';

export function toOwnerOptionsDto(
  ownerOptions: OwnerOptions,
): OwnerOptionsResponseDto {
  return {
    options: ownerOptions.options.map((option): OwnerOptionDto => {
      switch (option.type) {
        case 'personal':
          return { type: OwnerOptionType.PERSONAL };
        case 'team':
          return {
            type: OwnerOptionType.TEAM,
            teamId: option.teamId,
            teamName: option.teamName,
            memberCount: option.memberCount,
            editors: option.editors,
          };
        case 'org':
          return { type: OwnerOptionType.ORG, memberCount: option.memberCount };
      }
    }),
    orgEditorsIncludeNonAdmins: ownerOptions.orgEditorsIncludeNonAdmins,
  };
}
