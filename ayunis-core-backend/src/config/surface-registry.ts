import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { Request } from 'express';

export interface SurfaceFeatureFlag {
  readonly name: string;
  readonly envKey: string;
  readonly defaultEnabled: boolean;
}

export type SurfaceFraming = {
  readonly documents: readonly string[];
} & (
  | {
      readonly originsEnvKey: string;
      readonly defaultOrigins: readonly string[];
    }
  | {
      readonly resolveOrigins: (
        request: Request,
      ) => readonly string[] | Promise<readonly string[]>;
    }
);

export interface SurfaceDefinition {
  readonly signIn: 'cookie' | 'token' | 'visitor';
  readonly staticPrefix: string;
  readonly run: {
    readonly profile: { readonly id: string };
    readonly capabilities: readonly string[];
  } | null;
  readonly clientTools: readonly ToolType[];
  readonly webShellPaths?: readonly string[];
  readonly featureFlag: SurfaceFeatureFlag | null;
  readonly framing: SurfaceFraming | null;
  readonly manifest: {
    readonly route: string;
    readonly taskPane: string;
    readonly events: string;
    readonly classicEvents: string;
  } | null;
}

const outlookPrefix = '/outlook';
const outlookLaunchDocuments = {
  taskPane: 'taskpane.html',
  events: 'events.html',
} as const;

// Capability order is observable in the tools and the composed prompt.
export const SURFACE_REGISTRY = {
  web: {
    signIn: 'cookie',
    staticPrefix: '/',
    run: {
      profile: { id: 'chat' },
      capabilities: [
        'dateTime',
        'dataHandling',
        'anonymization',
        'behavior',
        'legalReferences',
        'customInstructions',
        'codeExecution',
        'emailCalendar',
        'filesChartsMap',
        'artifacts',
        'skills',
        'routines',
        'anonymizationException',
        'internet',
        'marketplace',
        'imageGeneration',
        'threadSources',
        'knowledgeBases',
        'recordings',
        'notificationContext',
        'releaseNoteContext',
        'onboarding',
        'featureGuide',
        'workspaceInstructions',
        'adoption',
        'memory',
        'chatHistory',
        'mcp',
      ],
    },
    clientTools: [
      ToolType.SEND_EMAIL,
      ToolType.CREATE_CALENDAR_EVENT,
      ToolType.CREATE_SKILL,
      ToolType.EDIT_SKILL,
      ToolType.INSTALL_MARKETPLACE_SKILL,
      ToolType.CREATE_ROUTINE,
      ToolType.EDIT_ROUTINE,
    ],
    featureFlag: null,
    framing: null,
    manifest: null,
  },
  outlook: {
    signIn: 'token',
    staticPrefix: outlookPrefix,
    run: {
      profile: { id: 'outlook' },
      capabilities: [
        'dateTime',
        'dataHandling',
        'anonymization',
        'behavior',
        'legalReferences',
        'outlookAddIn',
        'customInstructions',
        'internet',
        'threadSources',
        'knowledgeBases',
        'recordings',
        'notificationContext',
        'releaseNoteContext',
        'workspaceInstructions',
        'mcp',
      ],
    },
    clientTools: [
      ToolType.OUTLOOK_READ_EMAIL,
      ToolType.OUTLOOK_READ_ATTACHMENT,
      ToolType.OUTLOOK_DRAFT_EMAIL,
      ToolType.OUTLOOK_MOVE_EMAIL_TO_COMPOSER,
      ToolType.OUTLOOK_SAVE_EMAIL_TO_DRAFT,
    ],
    featureFlag: {
      name: 'outlookAddinEnabled',
      envKey: 'FEATURE_OUTLOOK_ADDIN_ENABLED',
      defaultEnabled: false,
    },
    webShellPaths: ['/login', '/handoff'],
    framing: {
      documents: Object.values(outlookLaunchDocuments),
      originsEnvKey: 'OUTLOOK_ADDIN_FRAME_ORIGINS',
      defaultOrigins: [
        'https://outlook.office.com',
        'https://outlook.office365.com',
        'https://outlook.cloud.microsoft',
        'https://outlook.live.com',
      ],
    },
    manifest: {
      route: `${outlookPrefix.slice(1)}/manifest.xml`,
      ...outlookLaunchDocuments,
      classicEvents: 'events-classic.js',
    },
  },
  website: {
    signIn: 'visitor',
    staticPrefix: '/embed',
    run: null,
    clientTools: [],
    featureFlag: null,
    framing: null,
    manifest: null,
  },
} as const satisfies Record<string, SurfaceDefinition>;

type Registry = typeof SURFACE_REGISTRY;
type SurfaceId = keyof Registry;

export type TokenSurfaceId = {
  [Id in SurfaceId]: Registry[Id]['signIn'] extends 'token' ? Id : never;
}[SurfaceId];

export const TOKEN_SURFACES = (
  Object.keys(SURFACE_REGISTRY) as SurfaceId[]
).filter((id): id is TokenSurfaceId => SURFACE_REGISTRY[id].signIn === 'token');
