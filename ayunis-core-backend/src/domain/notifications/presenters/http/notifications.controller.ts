import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { Response } from 'express';
import { Readable } from 'stream';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { CountUnreadNotificationsUseCase } from 'src/domain/notifications/application/use-cases/count-unread-notifications/count-unread-notifications.use-case';
import { DownloadNotificationImageQuery } from 'src/domain/notifications/application/use-cases/download-notification-image/download-notification-image.query';
import { DownloadNotificationImageUseCase } from 'src/domain/notifications/application/use-cases/download-notification-image/download-notification-image.use-case';
import { FindMyNotificationsQuery } from 'src/domain/notifications/application/use-cases/find-my-notifications/find-my-notifications.query';
import { FindMyNotificationsUseCase } from 'src/domain/notifications/application/use-cases/find-my-notifications/find-my-notifications.use-case';
import { FindNotificationQuery } from 'src/domain/notifications/application/use-cases/find-notification/find-notification.query';
import { FindNotificationUseCase } from 'src/domain/notifications/application/use-cases/find-notification/find-notification.use-case';
import { MarkAllNotificationsReadUseCase } from 'src/domain/notifications/application/use-cases/mark-all-notifications-read/mark-all-notifications-read.use-case';
import { MarkNotificationReadCommand } from 'src/domain/notifications/application/use-cases/mark-notification-read/mark-notification-read.command';
import { MarkNotificationReadUseCase } from 'src/domain/notifications/application/use-cases/mark-notification-read/mark-notification-read.use-case';
import {
  DEFAULT_NOTIFICATIONS_PAGE_SIZE,
  FindNotificationsQueryParamsDto,
} from './dto/find-notifications-query-params.dto';
import {
  NotificationResponseDto,
  PaginatedNotificationsResponseDto,
  UnreadNotificationCountResponseDto,
} from './dto/notification-response.dto';
import { NotificationDtoMapper } from './mappers/notification-dto.mapper';

const NOTIFICATION_ID_PARAM = {
  name: 'id',
  description: 'The UUID of the notification',
  type: 'string',
  format: 'uuid',
} as const;

/**
 * The current user's inbox. Only the recipient sees a notification; anyone
 * else gets 404. Not gated by the manage routines permission: notifications
 * stay readable when it is revoked.
 */
@ApiTags('notifications')
@RequireFeature(FeatureFlag.Routines)
@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(
    private readonly findMyNotificationsUseCase: FindMyNotificationsUseCase,
    private readonly countUnreadNotificationsUseCase: CountUnreadNotificationsUseCase,
    private readonly findNotificationUseCase: FindNotificationUseCase,
    private readonly markNotificationReadUseCase: MarkNotificationReadUseCase,
    private readonly markAllNotificationsReadUseCase: MarkAllNotificationsReadUseCase,
    private readonly downloadNotificationImageUseCase: DownloadNotificationImageUseCase,
    private readonly notificationDtoMapper: NotificationDtoMapper,
  ) {}

  @Get()
  @ApiOperation({
    summary: "List the current user's notifications, newest first",
  })
  @ApiResponse({ status: 200, type: PaginatedNotificationsResponseDto })
  async findAll(
    @Query() query: FindNotificationsQueryParamsDto,
  ): Promise<PaginatedNotificationsResponseDto> {
    this.logger.log(
      { routineId: query.routineId, type: query.type, unread: query.unread },
      'findAll',
    );
    const page = await this.findMyNotificationsUseCase.execute(
      new FindMyNotificationsQuery({
        limit: query.limit ?? DEFAULT_NOTIFICATIONS_PAGE_SIZE,
        offset: query.offset ?? 0,
        routineId: query.routineId,
        type: query.type,
        unread: query.unread,
      }),
    );
    return this.notificationDtoMapper.toPaginatedDto(page);
  }

  @Get('unread-count')
  @ApiOperation({
    summary: "Count the current user's unread notifications, also per type",
  })
  @ApiResponse({ status: 200, type: UnreadNotificationCountResponseDto })
  async countUnread(): Promise<UnreadNotificationCountResponseDto> {
    const counts = await this.countUnreadNotificationsUseCase.execute();
    return { count: counts.total, byType: counts.byType };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Mark all of the current user's notifications read",
  })
  @ApiResponse({ status: 204 })
  async markAllRead(): Promise<void> {
    this.logger.log('markAllRead');
    await this.markAllNotificationsReadUseCase.execute();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one of the current user’s notifications' })
  @ApiParam(NOTIFICATION_ID_PARAM)
  @ApiResponse({ status: 200, type: NotificationResponseDto })
  @ApiResponse({ status: 404, description: 'Not found or not the user’s' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<NotificationResponseDto> {
    this.logger.log({ id }, 'findOne');
    const notification = await this.findNotificationUseCase.execute(
      new FindNotificationQuery(id),
    );
    return this.notificationDtoMapper.toDto(notification);
  }

  @Get(':id/image')
  @ApiOperation({
    summary: 'Download the image of one of the current user’s notifications',
  })
  @ApiParam(NOTIFICATION_ID_PARAM)
  @ApiResponse({ status: 200, description: 'Image streamed successfully' })
  @ApiResponse({
    status: 404,
    description: 'Not found, not the user’s, or without an image',
  })
  async downloadImage(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    this.logger.log({ id }, 'downloadImage');
    const download = await this.downloadNotificationImageUseCase.execute(
      new DownloadNotificationImageQuery(id),
    );
    res.set('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(download.stream as unknown as Readable, {
      type: download.contentType,
      disposition: `inline; filename="${download.filename}"`,
    });
  }

  @Post(':id/read')
  @ApiOperation({
    summary: 'Mark one of the current user’s notifications read',
  })
  @ApiParam(NOTIFICATION_ID_PARAM)
  @ApiResponse({ status: 201, type: NotificationResponseDto })
  @ApiResponse({ status: 404, description: 'Not found or not the user’s' })
  async markRead(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<NotificationResponseDto> {
    this.logger.log({ id }, 'markRead');
    const notification = await this.markNotificationReadUseCase.execute(
      new MarkNotificationReadCommand(id),
    );
    return this.notificationDtoMapper.toDto(notification);
  }
}
