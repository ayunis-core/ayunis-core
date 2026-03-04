import { Controller, Get, Res } from '@nestjs/common';
import { PrometheusController } from '@willsoto/nestjs-prometheus';
import { Response } from 'express';
import { Public } from 'src/common/guards/public.guard';

/**
 * Custom metrics controller that extends the default PrometheusController.
 * Decorated with @Public() so all global guards (JWT, EmailConfirm, Roles,
 * Subscription, RateLimit) skip this endpoint. Actual protection is handled
 * by MetricsAuthMiddleware (basic-auth).
 */
@Public()
@Controller()
export class MetricsController extends PrometheusController {
  @Get()
  async index(@Res({ passthrough: true }) response: Response) {
    return super.index(response);
  }
}
