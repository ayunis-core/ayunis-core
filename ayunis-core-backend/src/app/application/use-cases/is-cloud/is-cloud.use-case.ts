import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class IsCloudUseCase {
  constructor(private readonly configService: ConfigService) {}

  execute(): boolean {
    return this.configService.get<boolean>('app.isCloudHosted') ?? false;
  }
}
