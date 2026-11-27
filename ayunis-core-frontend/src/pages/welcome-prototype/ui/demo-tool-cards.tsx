import { createToolCardRegistry } from '@ayunis/chat/tool-cards';
import { BarChartWidget } from '@/widgets/charts';
import { DemoArtifactCard, DemoRoutineCard } from './DemoCards';

export const DEMO_TOOL_CARDS = createToolCardRegistry({
  create_document: {
    action: { labelKey: 'chat.timeline.actions.create_document' },
    createsArtifact: true,
    render: ({ toolUse }) => (
      <DemoArtifactCard toolUse={toolUse} kind="document" />
    ),
  },
  create_spreadsheet: {
    action: { labelKey: 'chat.timeline.actions.create_spreadsheet' },
    createsArtifact: true,
    render: ({ toolUse }) => (
      <DemoArtifactCard toolUse={toolUse} kind="spreadsheet" />
    ),
  },
  create_routine: {
    action: { labelKey: 'chat.timeline.actions.create_routine' },
    render: ({ toolUse }) => <DemoRoutineCard toolUse={toolUse} />,
  },
  bar_chart: {
    action: { labelKey: 'chat.timeline.actions.chart' },
    createsArtifact: true,
    render: ({ toolUse, isStreaming }) => (
      <BarChartWidget content={toolUse} isStreaming={isStreaming} />
    ),
  },
});
