import {
  Body,
  Controller,
  Logger,
  Post,
  Req,
  Res,
  UseInterceptors,
  UploadedFiles,
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
} from '../../../threads/presenters/http/dto/get-thread-response.dto/message-response.dto';
import { RunInputMapper } from './mappers/run-input.mapper';
import {
  RunSessionResponseDto,
  RunMessageResponseDto,
  RunErrorResponseDto,
  RunThreadResponseDto,
  RunMasksResponseDto,
} from './dto/run-response.dto';
import { PiiMaskResponseDto } from 'src/domain/thread-pii-masks/presenters/http/dtos/pii-mask-response.dto';
import { SendMessageUseCase } from '../../application/use-cases/send-message/send-message.use-case';
import { SendMessageCommand } from '../../application/use-cases/send-message/send-message.command';
import { RequireSubscription } from 'src/iam/authorization/application/decorators/subscription.decorator';
import { RequestWithSubscriptionContext } from 'src/iam/authorization/application/guards/subscription.guard';
import { Response } from 'express';

import { MAX_IMAGES } from './image-upload.constants';
import { IMAGE_UPLOAD_OPTIONS } from './image-upload.options';
import {
  SEND_MESSAGE_API_BODY,
  SEND_MESSAGE_API_OPERATION,
  SEND_MESSAGE_SSE_RESPONSE,
} from './send-message.swagger';
import { RunSsePresenter } from './sse/run-sse.presenter';
import { SendMessageRequestValidator } from './validation/send-message-request.validator';

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
)
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
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async sendMessage(
    @Body() sendMessageDto: SendMessageDto,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Req() request: RequestWithSubscriptionContext,
    @Res() response: Response,
  ): Promise<void> {
    const uploadedFiles = files ?? [];

    this.logger.log('sendMessage', {
      userId,
      threadId: sendMessageDto.threadId,
      streaming: sendMessageDto.streaming,
      fileCount: uploadedFiles.length,
      hasText: !!sendMessageDto.text?.trim(),
      hasToolResult: !!sendMessageDto.toolResult,
    });

    this.requestValidator.validate(sendMessageDto, uploadedFiles);

    const command = new SendMessageCommand({
      threadId: sendMessageDto.threadId,
      input: RunInputMapper.toCommand(
        sendMessageDto,
        uploadedFiles,
        sendMessageDto.skillId,
      ),
      streaming: sendMessageDto.streaming ?? true,
      consumeTrialMessage: Boolean(
        request.subscriptionContext?.hasRemainingTrialMessages,
      ),
    });

    await this.ssePresenter.stream(
      response,
      sendMessageDto.threadId,
      this.sendMessageUseCase.execute(command),
    );
  }
}
