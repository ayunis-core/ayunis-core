import { MeResponseDto } from '../dtos/auth-response.dto';
import { ActiveUser } from '../../../domain/active-user.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MeResponseDtoMapper {
  toDto(user: ActiveUser): MeResponseDto {
    return {
      email: user.email,
      role: user.role,
      name: user.name,
    };
  }
}
