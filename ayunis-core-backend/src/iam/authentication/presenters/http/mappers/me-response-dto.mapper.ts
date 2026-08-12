import { MeResponseDto } from '../dtos/auth-response.dto';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MeResponseDtoMapper {
  toDto(user: ActiveUser): MeResponseDto {
    return {
      id: user.id,
      orgId: user.orgId,
      email: user.email,
      role: user.role,
      systemRole: user.systemRole,
      name: user.name,
    };
  }
}
