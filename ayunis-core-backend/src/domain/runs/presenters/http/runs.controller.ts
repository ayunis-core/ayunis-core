import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UseInterceptors,
  UploadedFiles,
  Logger,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiOperation,
  ApiBody,
  ApiTags,
  ApiResponse,
  ApiExtraModels,
  ApiConsumes,
} from '@nestjs/swagger';
import {
  SendMessageDto,
  TextInput,
  ToolCallDecisionDto,
  ToolResultInput,
} from './dto/send-message.dto';
import { UUID } from 'crypto';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import {
  UserMessageResponseDto,
  AssistantMessageResponseDto,
  ToolResultMessageResponseDto,
  SystemMessageResponseDto,
  MessageContentResponseDto,
  TextMessageContentResponseDto,
  ToolUseMessageContentResponseDto,
  ToolResultMessageContentResponseDto as ToolResultContentDto,
  ThinkingMessageContentResponseDto,
} from 'src/domain/threads/presenters/http/dto/get-thread-response.dto/message-response.dto';
import type { RunInput } from 'src/domain/runs/domain/run-input.entity';
import { RunInputMapper } from './mappers/run-input.mapper';
import {
  RunSessionResponseDto,
  RunMessageResponseDto,
  RunErrorResponseDto,
  RunThreadResponseDto,
  RunMasksResponseDto,
} from './dto/run-response.dto';
import { PiiMaskResponseDto } from 'src/domain/thread-pii-masks/presenters/http/dtos/pii-mask-response.dto';
import { SendMessageUseCase } from 'src/domain/runs/application/use-cases/send-message/send-message.use-case';
import { SendMessageCommand } from 'src/domain/runs/application/use-cases/send-message/send-message.command';
import { RequireSubscription } from 'src/iam/authorization/application/decorators/subscription.decorator';
import { RequestWithSubscriptionContext } from 'src/iam/authorization/application/guards/subscription.guard';
import { Response } from 'express';

import { MAX_IMAGES } from './image-upload.constants';
import {
  IMAGE_UPLOAD_ADMISSION,
  IMAGE_UPLOAD_OPTIONS,
} from './image-upload.options';
import {
  SEND_MESSAGE_API_BODY,
  SEND_MESSAGE_API_OPERATION,
  SEND_MESSAGE_SSE_RESPONSE,
} from './send-message.swagger';
import { RunSsePresenter } from './sse/run-sse.presenter';
import { SendMessageRequestValidator } from './validation/send-message-request.validator';
import { RequireAcademyCertificate } from 'src/iam/academy-access/application/decorators/academy-certificate.decorator';

@ApiTags('runs')
@ApiExtraModels(
  UserMessageResponseDto,
  AssistantMessageResponseDto,
  ToolResultMessageResponseDto,
  SystemMessageResponseDto,
  MessageContentResponseDto,
  TextMessageContentResponseDto,
  ToolUseMessageContentResponseDto,
  ToolResultContentDto,
  ThinkingMessageContentResponseDto,
  RunSessionResponseDto,
  RunMessageResponseDto,
  RunErrorResponseDto,
  RunThreadResponseDto,
  RunMasksResponseDto,
  PiiMaskResponseDto,
  SendMessageDto,
  TextInput,
  ToolResultInput,
  ToolCallDecisionDto,
)
@RequireAcademyCertificate()
@Controller('runs')
export class RunsController {
  private readonly logger = new Logger(RunsController.name);

  constructor(
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly requestValidator: SendMessageRequestValidator,
    private readonly ssePresenter: RunSsePresenter,
  ) {}

  @Post('send-message')
  @RequireSubscription()
  @UseInterceptors(FilesInterceptor('images', MAX_IMAGES, IMAGE_UPLOAD_OPTIONS))
  @ApiConsumes('multipart/form-data')
  @ApiOperation(SEND_MESSAGE_API_OPERATION)
  @ApiBody(SEND_MESSAGE_API_BODY)
  @ApiResponse(SEND_MESSAGE_SSE_RESPONSE)
  @ApiResponse({ status: 400, description: 'Invalid request payload' })
  @ApiResponse({ status: 403, description: 'Subscription required' })
  @ApiResponse({ status: 429, description: 'Image uploads busy' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async sendMessage(
    @Body() sendMessageDto: SendMessageDto,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Req() request: RequestWithSubscriptionContext,
    @Res() response: Response,
  ): Promise<void> {
    const uploadedFiles = files ?? [];
    this.logRequest(userId, sendMessageDto, uploadedFiles.length);
    const releaseUploads = IMAGE_UPLOAD_ADMISSION.transfer(request);
    // The run outlives this request and releases the uploads when it ends,
    // so only a request that never started one releases them here.
    try {
      this.requestValidator.validate(sendMessageDto, uploadedFiles);
      // Built before the stream opens, so a failure is an ordinary error
      // response that reaches the catch below.
      const input = RunInputMapper.toCommand(
        sendMessageDto,
        uploadedFiles,
        sendMessageDto.skillId,
        releaseUploads,
      );
      await this.ssePresenter.stream(
        response,
        sendMessageDto.threadId,
        (signal) =>
          this.sendMessageUseCase.execute(
            this.createCommand(sendMessageDto, input, {
              consumeTrialMessage: Boolean(
                request.subscriptionContext?.hasRemainingTrialMessages,
              ),
              signal,
            }),
          ),
      );
    } catch (error) {
      releaseUploads();
      throw error;
    }
  }

  private logRequest(
    userId: UUID,
    dto: SendMessageDto,
    fileCount: number,
  ): void {
    this.logger.log(
      {
        userId,
        threadId: dto.threadId,
        streaming: dto.streaming,
        fileCount,
        hasText: !!dto.text?.trim(),
        hasToolResult: !!dto.toolResult,
        decisionCount: dto.decisions?.length,
      },
      'sendMessage',
    );
  }

  private createCommand(
    dto: SendMessageDto,
    input: RunInput,
    run: { consumeTrialMessage: boolean; signal: AbortSignal },
  ): SendMessageCommand {
    return new SendMessageCommand({
      threadId: dto.threadId,
      input,
      streaming: dto.streaming ?? true,
      consumeTrialMessage: run.consumeTrialMessage,
      signal: run.signal,
    });
  }
}
