import { Injectable } from '@nestjs/common';
import {
  InferenceHandler,
  InferenceInput,
  InferenceResponse,
} from '../../application/ports/inference.handler';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text.message-content.entity';

@Injectable()
export class MockInferenceHandler extends InferenceHandler {
  answer(input: InferenceInput): Promise<InferenceResponse> {
    return Promise.resolve(
      new InferenceResponse(
        [
          new TextMessageContent(
            `${input.model.provider}::${input.model.name}`,
          ),
        ],
        {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        },
      ),
    );
  }
}
