export const modelsContent = `
# Models

Models are the AI language models that power conversations and agents.

## Supported Models

Ayunis Core supports multiple LLM models from different providers:

- **Open Telekom Cloud**: Open Source Models (e.g. GPT-OSS or Qwen 3) or commercial models (e.g. GPT-5, Claude 4.5 Sonnet)
- **Mistral**: Mistral AI models (e.g. Mistral-7B-Instruct, Mistral-7B-Chat)
- **OpenAI** or **Anthropic**: For direct integration with their APIs

## Model Configuration

Administrators can configure which models are available:

1. Navigate to **Admin Settings > Models**
2. Enable specific models for your organization
3. Optionally enable privacy mode to anonymize model input before sending it to the model

## Choosing a Model

When creating an agent or starting a conversation:

1. Select from available models in the dropdown
2. Consider the trade-offs:
   - **Capability**: More advanced models handle complex tasks better (e.g. reasoning, tool use)
   - **Speed**: Smaller models respond faster
   - **Privacy**: A flag next to the model name indicates where the model is hosted

## Embedding Models

For Sources (RAG), separate embedding models are used:
- These convert text to semantic vectors
- Configure in **Admin Settings > Models** 
- IMPORTANT:At least one embedding model must be enabled in order to enable document analysis features
`;
