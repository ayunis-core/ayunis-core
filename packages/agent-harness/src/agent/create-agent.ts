import type {
  Agent,
  AgentConfig,
  AgentVariantConfig,
} from '../contracts/agent';
import {
  composeAgentVariant,
  prepareAgentConfig,
  type PreparedAgentConfig,
} from './agent-config';
import { runAgent } from './run-agent';

export const createAgent = <ModelSelector>(
  config: AgentConfig<ModelSelector>,
): Agent<ModelSelector> => createPreparedAgent(prepareAgentConfig(config));

const createPreparedAgent = <ModelSelector>(
  config: PreparedAgentConfig<ModelSelector>,
): Agent<ModelSelector> => {
  const agent: Agent<ModelSelector> = {
    name: config.name,
    variant: (variant: AgentVariantConfig) =>
      createPreparedAgent(composeAgentVariant(config, variant)),
    run: (input) => runAgent(config, input),
  };
  return Object.freeze(agent);
};
