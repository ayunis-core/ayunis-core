import { createToolCardRegistry } from '@ayunis/chat/tool-cards';
import {
  artifactToolCards,
  type ArtifactFamily,
} from '@/pages/chat/ui/chat-widgets/artifact-tool-cards';
import {
  BarChartWidget,
  LineChartWidget,
  PieChartWidget,
} from '@/widgets/charts';
import { generatedImageIdFromToolResult } from './generated-image-id';
import CreateFileWidget from '@/pages/chat/ui/chat-widgets/CreateFileWidget';
import SendEmailWidget from '@/pages/chat/ui/chat-widgets/SendEmailWidget';
import CreateCalendarEventWidget from '@/pages/chat/ui/chat-widgets/CreateCalendarEventWidget';
import CreateSkillWidget from '@/pages/chat/ui/chat-widgets/CreateSkillWidget';
import EditSkillWidget from '@/pages/chat/ui/chat-widgets/EditSkillWidget';
import CreateRoutineWidget from '@/pages/chat/ui/chat-widgets/CreateRoutineWidget';
import EditRoutineWidget from '@/pages/chat/ui/chat-widgets/EditRoutineWidget';
import InstallMarketplaceSkillWidget from '@/pages/chat/ui/chat-widgets/InstallMarketplaceSkillWidget';
import AddAnonymizationExceptionWidget from '@/pages/chat/ui/chat-widgets/AddAnonymizationExceptionWidget';
import GenerateImageWidget from '@/pages/chat/ui/chat-widgets/GenerateImageWidget';
import LazyGeoJsonMapWidget from '@/pages/chat/ui/chat-widgets/LazyGeoJsonMapWidget';

export const chatToolCards = createToolCardRegistry<ArtifactFamily>({
  ...artifactToolCards,
  create_file: {
    action: {
      labelKey: 'chat.timeline.actions.create_file',
      targetParams: ['filename'],
    },
    createsArtifact: true,
    render: ({ toolUse, isStreaming }) => (
      <CreateFileWidget content={toolUse} isStreaming={isStreaming} />
    ),
  },
  send_email: {
    action: {
      labelKey: 'chat.timeline.actions.send_email',
      targetParams: ['subject', 'to'],
    },
    render: ({ toolUse, isStreaming }) => (
      <SendEmailWidget content={toolUse} isStreaming={isStreaming} />
    ),
  },
  create_calendar_event: {
    action: {
      labelKey: 'chat.timeline.actions.create_calendar_event',
      targetParams: ['title'],
    },
    render: ({ toolUse, isStreaming }) => (
      <CreateCalendarEventWidget content={toolUse} isStreaming={isStreaming} />
    ),
  },
  create_skill: {
    action: {
      labelKey: 'chat.timeline.actions.create_skill',
      targetParams: ['name'],
    },
    render: ({ toolUse, isStreaming, threadId }) => (
      <CreateSkillWidget
        content={toolUse}
        isStreaming={isStreaming}
        threadId={threadId}
      />
    ),
  },
  edit_skill: {
    action: {
      labelKey: 'chat.timeline.actions.edit_skill',
      targetParams: ['name'],
    },
    render: ({ toolUse, isStreaming, threadId }) => (
      <EditSkillWidget
        content={toolUse}
        isStreaming={isStreaming}
        threadId={threadId}
      />
    ),
  },
  create_routine: {
    action: {
      labelKey: 'chat.timeline.actions.create_routine',
      targetParams: ['name'],
    },
    render: ({ toolUse, isStreaming }) => (
      <CreateRoutineWidget content={toolUse} isStreaming={isStreaming} />
    ),
  },
  edit_routine: {
    action: {
      labelKey: 'chat.timeline.actions.edit_routine',
      targetParams: ['name'],
    },
    render: ({ toolUse, isStreaming }) => (
      <EditRoutineWidget content={toolUse} isStreaming={isStreaming} />
    ),
  },
  install_marketplace_skill: {
    action: {
      labelKey: 'chat.timeline.actions.install_marketplace_skill',
      targetParams: ['name', 'identifier'],
    },
    render: ({ toolUse, isStreaming, threadId }) => (
      <InstallMarketplaceSkillWidget
        content={toolUse}
        isStreaming={isStreaming}
        threadId={threadId}
      />
    ),
  },
  add_anonymization_exception: {
    action: { labelKey: 'chat.timeline.actions.add_anonymization_exception' },
    render: ({ toolUse, isStreaming, result }) => (
      <AddAnonymizationExceptionWidget
        content={toolUse}
        isStreaming={isStreaming}
        result={result}
      />
    ),
  },
  bar_chart: {
    action: {
      labelKey: 'chat.timeline.actions.chart',
      targetParams: ['title'],
    },
    createsArtifact: true,
    render: ({ toolUse, isStreaming }) => (
      <BarChartWidget content={toolUse} isStreaming={isStreaming} />
    ),
  },
  line_chart: {
    action: {
      labelKey: 'chat.timeline.actions.chart',
      targetParams: ['title'],
    },
    createsArtifact: true,
    render: ({ toolUse, isStreaming }) => (
      <LineChartWidget content={toolUse} isStreaming={isStreaming} />
    ),
  },
  pie_chart: {
    action: {
      labelKey: 'chat.timeline.actions.chart',
      targetParams: ['title'],
    },
    createsArtifact: true,
    render: ({ toolUse, isStreaming }) => (
      <PieChartWidget content={toolUse} isStreaming={isStreaming} />
    ),
  },
  map: {
    action: { labelKey: 'chat.timeline.actions.map', targetParams: ['title'] },
    render: ({ toolUse, isStreaming }) => (
      <LazyGeoJsonMapWidget content={toolUse} isStreaming={isStreaming} />
    ),
  },
  generate_image: {
    action: {
      labelKey: 'chat.timeline.actions.generate_image',
      targetParams: ['prompt'],
    },
    createsArtifact: true,
    render: ({ toolUse, isStreaming, result, threadId }) => (
      <GenerateImageWidget
        content={toolUse}
        isStreaming={isStreaming}
        imageId={generatedImageIdFromToolResult(result)}
        threadId={threadId}
      />
    ),
  },
});
