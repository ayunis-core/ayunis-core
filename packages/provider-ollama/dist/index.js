// src/ollama-provider.ts
import { Ollama } from "ollama";

// src/convert-chunk.ts
import { randomUUID } from "crypto";
var convertChunk = (chunk) => {
  const message = chunk.message;
  const result = {};
  let carriesSomething = false;
  if (message.thinking) {
    result.thinkingDelta = message.thinking;
    carriesSomething = true;
  }
  if (message.content) {
    result.textDelta = message.content;
    carriesSomething = true;
  }
  const toolCallDeltas = extractToolCallDeltas(message.tool_calls);
  if (toolCallDeltas.length > 0) {
    result.toolCallDeltas = toolCallDeltas;
    carriesSomething = true;
  }
  if (chunk.done) {
    result.finishReason = mapFinishReason(chunk.done_reason);
    result.usage = {
      inputTokens: chunk.prompt_eval_count,
      outputTokens: chunk.eval_count
    };
    carriesSomething = true;
  }
  return carriesSomething ? result : null;
};
var extractToolCallDeltas = (toolCalls) => toolCalls?.map((toolCall) => ({
  index: 0,
  id: randomUUID(),
  name: toolCall.function.name,
  argumentsDelta: JSON.stringify(toolCall.function.arguments)
})) ?? [];
var mapFinishReason = (reason) => reason === "length" ? "length" : "stop";

// src/convert-request.ts
var convertTool = (tool) => {
  const fn = {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    strict: true
  };
  return { type: "function", function: fn };
};
var convertMessages = (instructions, messages) => {
  const converted = [];
  if (instructions) {
    converted.push({ role: "system", content: instructions });
  }
  for (const message of messages) {
    if (message.role === "assistant") {
      converted.push(convertAssistant(message.content));
    } else if (message.role === "tool_result") {
      converted.push(...convertToolResults(message.content));
    } else if (message.role === "system") {
      converted.push({ role: "system", content: joinText(message.content) });
    } else {
      const user = convertUser(message.content);
      if (user) {
        converted.push(user);
      }
    }
  }
  return converted;
};
var convertUser = (content) => {
  const textParts = [];
  const images = [];
  for (const c of content) {
    if (c.type === "text") {
      textParts.push(c.text);
    } else if (c.type === "image") {
      images.push(c.data);
    }
  }
  if (textParts.length === 0 && images.length === 0) {
    return null;
  }
  return {
    role: "user",
    content: textParts.join("\n"),
    images: images.length > 0 ? images : void 0
  };
};
var convertAssistant = (content) => {
  let text;
  let thinking;
  const toolCalls = [];
  for (const c of content) {
    if (c.type === "text") {
      text = c.text;
    } else if (c.type === "thinking") {
      thinking = c.thinking;
    } else if (c.type === "tool_use") {
      toolCalls.push({ function: { name: c.name, arguments: c.input } });
    }
  }
  return {
    role: "assistant",
    content: text ?? "",
    thinking,
    tool_calls: toolCalls.length > 0 ? toolCalls : void 0
  };
};
var convertToolResults = (content) => content.filter((c) => {
  return c.type === "tool_result";
}).map((c) => ({ role: "tool", content: c.result }));
var joinText = (content) => content.filter((c) => {
  return c.type === "text";
}).map((c) => c.text).join("");

// src/ollama-provider.ts
var DEFAULT_NUM_CTX = 3e4;
var RETRY_BASE_DELAY_MS = 1e3;
var ollama = (options) => {
  const client = new Ollama({
    host: options.baseUrl,
    ...options.headers ? { headers: options.headers } : {}
  });
  return {
    name: `ollama:${options.model}`,
    stream: (request) => streamChat(client, options, request)
  };
};
async function* streamChat(client, options, request) {
  const params = buildParams(options, request);
  const iterator = await retry(
    () => client.chat(params),
    options.maxRetries ?? 0
  );
  if (request.signal) {
    if (request.signal.aborted) {
      iterator.abort();
    } else {
      request.signal.addEventListener("abort", () => iterator.abort(), {
        once: true
      });
    }
  }
  for await (const chunk of iterator) {
    const converted = convertChunk(chunk);
    if (converted) {
      yield converted;
    }
    if (chunk.done) {
      break;
    }
  }
}
var buildParams = (options, request) => {
  const tools = request.tools.map(convertTool);
  return {
    model: options.model,
    messages: convertMessages(request.instructions, request.messages),
    tools: tools.length > 0 ? tools : void 0,
    stream: true,
    options: { num_ctx: options.numCtx ?? DEFAULT_NUM_CTX }
  };
};
async function retry(fn, maxRetries) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await delay(RETRY_BASE_DELAY_MS * 2 ** attempt);
      }
    }
  }
  throw lastError;
}
var delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export {
  ollama
};
//# sourceMappingURL=index.js.map