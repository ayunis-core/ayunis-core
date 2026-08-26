import { test, expect } from '../../src/fixtures/test';
import { generatedApi } from '../../src/clients/api/generated-api';

interface ChatCompletionResponse {
  choices: Array<{ message: { content: string | null } }>;
}

test('sends an inline document through OpenAI-compatible chat completions', async ({
  api,
  publicApi,
  org,
}) => {
  const apiKey = await generatedApi.apiKeysControllerCreateApiKey(
    { name: `E2E inline document ${Date.now()}` },
    { api },
  );
  const documentText = 'The council meeting starts at 18:30.';

  const response = await publicApi.post(
    '/api/openai-compat/v1/chat/completions',
    {
      headers: { Authorization: `Bearer ${apiKey.secret}` },
      data: {
        model: org.defaultModel.name,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'file',
                file: {
                  filename: 'council-meeting.txt',
                  file_data: Buffer.from(documentText).toString('base64'),
                },
              },
              { type: 'text', text: 'When does the meeting start?' },
            ],
          },
        ],
      },
    },
  );

  expect(response.status()).toBe(200);
  const completion = (await response.json()) as ChatCompletionResponse;
  expect(completion.choices[0]?.message.content).toBe(
    `${org.defaultModel.provider}::${org.defaultModel.name}`,
  );
});
