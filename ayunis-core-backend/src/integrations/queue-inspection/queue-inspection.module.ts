import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { JwtConfigModule } from 'src/iam/authentication/jwt.module';
import { IpAllowlistModule } from 'src/iam/ip-allowlist/ip-allowlist.module';
import { BullBoardAuthMiddleware } from './bull-board-auth.middleware';
import {
  BULL_BOARD_PATH,
  QUEUE_INSPECTION_QUEUE_NAMES,
} from './queue-inspection.constants';
import { SafeBullMQAdapter } from './safe-bullmq.adapter';
import { CookieParserMiddleware } from 'src/common/middleware/cookie-parser.middleware';

const queueRegistrations = QUEUE_INSPECTION_QUEUE_NAMES.map((name) => ({
  name,
}));

const queueBoardRegistrations = QUEUE_INSPECTION_QUEUE_NAMES.map((name) => ({
  name,
  adapter: SafeBullMQAdapter,
}));

@Module({
  imports: [
    BullBoardModule.forRootAsync({
      imports: [JwtConfigModule, IpAllowlistModule],
      useFactory: () => ({
        route: BULL_BOARD_PATH,
        adapter: ExpressAdapter,
        middleware: [CookieParserMiddleware, BullBoardAuthMiddleware],
        boardOptions: {
          uiConfig: {
            boardTitle: 'Ayunis Core Queues',
            hideRedisDetails: true,
          },
        },
      }),
    }),
    BullModule.registerQueue(...queueRegistrations),
    BullBoardModule.forFeature(...queueBoardRegistrations),
  ],
})
export class QueueInspectionModule {}
