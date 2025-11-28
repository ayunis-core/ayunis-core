export const agentsContent = `
# Agents

Agents are customizable AI assistants that you can use for your reocurring tasks and workflows.

## What is an Agent?

An Agent is a configured AI assistant with:
- **Custom instructions**: Define how the agent should behave and respond
- **Model selection**: Choose which LLM model powers the agent
- **Knowledge base**: Provide the agent with knowledge from your documents
- **Integrations**: Connect the agent to external services

## Differences between Agents and Prompts

- Agents encapsulate a complete use case, while prompts are reusable text templates.
- Agents are more powerful than prompts, as they can use the knowledge base and integrations to answer your questions.
- Use agents for end to end use cases, while prompts are best for referencing specific text snippets.

## Creating an Agent

1. Navigate to **Agents** in the sidebar
2. Click **Create Agent**
3. Fill in the agent details:
   - **Name**: A descriptive name for the agent
   - **Instructions**: System prompt that defines the agent's behavior
   - **Model**: Select the AI model to use
4. Optionally upload documents to the knowledge base
5. Optionally enable integrations
6. Click **Save**

## Using an Agent

1. Start a new conversation
2. Select your agent from the agent dropdown (robot icon)
3. The agent will follow its configured instructions, using the knowledge base and integrations to answer your questions

## Best Practices

- Write clear, specific instructions for consistent behavior
- Assign only the tools the agent needs
- Test your agent before sharing with others
- Use sources to give agents domain-specific knowledge
- Enable integrations to extend agent capabilities
`;
