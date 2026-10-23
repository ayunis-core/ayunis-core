import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from 'src/common/guards/public.guard';
import { CoreConnectAuthGuard } from 'src/integrations/core-connect/application/guards/core-connect-auth.guard';

@ApiExcludeController()
@Public()
@UseGuards(CoreConnectAuthGuard)
@Controller('internal/core-connect')
export class CoreConnectController {
  @Get('auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  authenticate(): undefined {
    return undefined;
  }
}
