import type { IntegrationWarning } from 'src/domain/runs/domain/run-integration-warning';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import type {
  CapabilityAssemblyState,
  CapabilityCatalogEntry,
  CapabilityContribution,
  CapabilityHookFactory,
  PromptSection,
  RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';

/** Collects the contributions of a profile's capabilities in order. */
export class CapabilityAssembly {
  readonly tools: Tool[] = [];
  readonly warnings: IntegrationWarning[] = [];
  readonly sections: PromptSection[] = [];
  readonly hooks: CapabilityHookFactory[] = [];
  readonly catalog: CapabilityCatalogEntry[] = [];
  private readonly loadableToolNames = new Set<string>();

  state(): CapabilityAssemblyState {
    return {
      reservedToolNames: new Set([
        ...this.tools.map((tool) => tool.name),
        ...this.loadableToolNames,
      ]),
      loadableToolNames: new Set(this.loadableToolNames),
    };
  }

  add(contribution: CapabilityContribution): void {
    this.tools.push(...(contribution.tools ?? []));
    this.warnings.push(...(contribution.warnings ?? []));
    this.sections.push(...(contribution.sections ?? []));
    this.hooks.push(...(contribution.hooks ?? []));
  }

  /**
   * Keeps only a catalog entry for an on-demand capability that is not
   * loaded. Without tools it has nothing to load, so it is left out.
   */
  defer(capability: RunCapability, contribution: CapabilityContribution): void {
    this.warnings.push(...(contribution.warnings ?? []));
    const toolNames = (contribution.tools ?? []).map((tool) => tool.name);
    if (toolNames.length === 0) return;
    for (const name of toolNames) this.loadableToolNames.add(name);
    this.catalog.push({
      id: capability.id,
      description: capability.description,
      toolNames,
    });
  }
}
