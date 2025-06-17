import {
  RunInput,
  RunTextInput,
  RunToolResultInput,
} from 'src/domain/runs/domain/run-input.entity';
import { SendMessageDto } from '../dto/send-message.dto';

export class RunInputMapper {
  static toCommand(dto: SendMessageDto['input']): RunInput {
    if ('type' in dto && dto.type === 'text') {
      return new RunTextInput(dto.text);
    } else if ('type' in dto && dto.type === 'tool_result') {
      const toolResult = dto;
      return new RunToolResultInput(
        toolResult.toolId,
        toolResult.toolName,
        toolResult.result,
      );
    } else {
      throw new Error('Invalid input type');
    }
  }
}
