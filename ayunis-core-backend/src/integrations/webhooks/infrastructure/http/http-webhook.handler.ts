import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhookHandler } from '../../application/ports/webhook.handler';
import { WebhookEvent } from '../../domain/webhook-event.entity';
import {
  WebhookDeliveryFailedError,
  WebhookTimeoutError,
} from '../../application/errors/webhook.errors';

@Injectable()
export class HttpWebhookHandler extends WebhookHandler {
  private readonly logger = new Logger(HttpWebhookHandler.name);
  private readonly maxRetries = 3;
  private readonly timeoutMs = 10000; // 10 seconds
  private readonly baseBackoffMs = 1000; // 1 second

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async sendWebhook(event: WebhookEvent): Promise<void> {
    const webhookUrl = this.configService.get<string>(
      'app.orgEventsWebhookUrl',
    );

    if (!webhookUrl) {
      this.logger.debug(
        'Webhook URL not configured, skipping webhook delivery',
        {
          eventType: event.eventType,
          eventId: event.id,
        },
      );
      return;
    }

    this.logger.log('Attempting webhook delivery', {
      eventType: event.eventType,
      eventId: event.id,
      webhookUrl,
    });

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await this.deliverWebhook(event, webhookUrl);
        this.logger.debug('Webhook delivered successfully', {
          eventType: event.eventType,
          eventId: event.id,
          attempt,
        });
        return; // Success
      } catch (error) {
        const isLastAttempt = attempt === this.maxRetries;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        if (isLastAttempt) {
          this.logger.error('Webhook delivery failed after all retries', {
            eventType: event.eventType,
            eventId: event.id,
            attempts: this.maxRetries,
            error: errorMessage,
          });
          throw new WebhookDeliveryFailedError(event.eventType, errorMessage);
        }

        const delay = this.baseBackoffMs * Math.pow(2, attempt - 1);
        this.logger.warn(
          `Webhook delivery attempt ${attempt} failed, retrying in ${delay}ms`,
          {
            eventType: event.eventType,
            eventId: event.id,
            error: errorMessage,
            nextRetryIn: delay,
          },
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  private async deliverWebhook(
    event: WebhookEvent,
    webhookUrl: string,
  ): Promise<void> {
    const payload = {
      eventId: event.id,
      eventType: event.eventType,
      timestamp: event.timestamp.toISOString(),
      data: event.data,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Ayunis-Core-Webhook/1.0',
          'X-Webhook-Event-Id': event.id,
          'X-Webhook-Event-Type': event.eventType,
          'X-Webhook-Timestamp': event.timestamp.toISOString(),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.logger.debug('Webhook HTTP request completed successfully', {
        eventId: event.id,
        responseStatus: response.status,
        responseStatusText: response.statusText,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new WebhookTimeoutError(event.eventType, this.timeoutMs);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
