import { ValidationPipe } from '@nestjs/common';
import { SendMessageDto } from 'src/domain/runs/presenters/http/dto/send-message.dto';

// The global pipe of main.ts; multipart sends nested inputs as JSON strings.
const pipe = new ValidationPipe({ whitelist: true, transform: true });

function parse(body: Record<string, unknown>): Promise<SendMessageDto> {
  return pipe.transform(body, {
    type: 'body',
    metatype: SendMessageDto,
  }) as Promise<SendMessageDto>;
}

describe('SendMessageDto', () => {
  it('keeps the fields of a tool result posted as multipart JSON, so the client result reaches its pending call', async () => {
    const dto = await parse({
      threadId: 'f4b2e1d0-3c5a-4b7e-9d8f-1a2b3c4d5e6f',
      toolResult: JSON.stringify({
        toolId: 'call-1',
        toolName: 'outlook__read_email',
        result: '{"subject":"Bauantrag"}',
      }),
    });

    expect(dto.toolResult).toMatchObject({
      type: 'tool_result',
      toolId: 'call-1',
      toolName: 'outlook__read_email',
      result: '{"subject":"Bauantrag"}',
    });
  });

  it('rejects a tool result without a tool id', async () => {
    await expect(
      parse({
        threadId: 'f4b2e1d0-3c5a-4b7e-9d8f-1a2b3c4d5e6f',
        toolResult: JSON.stringify({ toolName: 'x', result: 'y' }),
      }),
    ).rejects.toThrow();
  });
  it('keeps the fields of a tool result posted as a JSON object, the path the web client uses', async () => {
    const dto = await parse({
      threadId: 'f4b2e1d0-3c5a-4b7e-9d8f-1a2b3c4d5e6f',
      toolResult: {
        toolId: 'call-1',
        toolName: 'outlook__read_email',
        result: '{"subject":"Bauantrag"}',
      },
    });

    expect(dto.toolResult).toMatchObject({
      type: 'tool_result',
      toolId: 'call-1',
      toolName: 'outlook__read_email',
      result: '{"subject":"Bauantrag"}',
    });
  });

  it('rejects a list of tool results, which would reach the run with no tool id', async () => {
    await expect(
      parse({
        threadId: 'f4b2e1d0-3c5a-4b7e-9d8f-1a2b3c4d5e6f',
        toolResult: JSON.stringify([
          { toolId: 'call-1', toolName: 'outlook__read_email', result: 'x' },
        ]),
      }),
    ).rejects.toThrow();
  });
});
