import { MeResponseDto } from '../dtos/auth-response.dto';
import { ActiveUser } from '../../../domain/active-user.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MeResponseDtoMapper {
  toDto(user: ActiveUser): MeResponseDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
  }
}
