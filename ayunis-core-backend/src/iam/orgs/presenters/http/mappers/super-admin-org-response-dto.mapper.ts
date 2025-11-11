import { Injectable } from '@nestjs/common';
import { Org } from '../../../domain/org.entity';
import {
  SuperAdminOrgListResponseDto,
  SuperAdminOrgResponseDto,
} from '../dtos/super-admin-org-response.dto';

@Injectable()
export class SuperAdminOrgResponseDtoMapper {
  toDto(org: Org): SuperAdminOrgResponseDto {
    return {
      id: org.id,
      name: org.name,
      createdAt: org.createdAt,
    };
  }

  toListDto(orgs: Org[]): SuperAdminOrgListResponseDto {
    return {
      orgs: orgs.map((org) => this.toDto(org)),
    };
  }
}
