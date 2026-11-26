import { FeatureFlag } from 'src/config/features.config';
import { GuideFeature } from 'src/domain/threads/domain/guide-feature.enum';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';

export interface GuideCreatePermission {
  readonly permission: Permission;
  /** The next step for users whose role lacks the permission. */
  readonly otherwise: string;
}

export interface GuideToolOffer {
  readonly tool: ToolType;
  readonly offer: string;
}

/**
 * What a feature-guide chat tells the model about one feature. UI labels are
 * the app's own, given as "English" / "German".
 */
export interface FeatureGuide {
  /** The page the chat was started from, e.g. "Knowledge" / "Wissen". */
  readonly page: string;
  readonly plural: string;
  readonly flag?: FeatureFlag;
  /** Who may create one; omitted when every user may. */
  readonly createPermission?: GuideCreatePermission;
  readonly facts: string;
  /** Path of the help center article, below `https://help.ayunis.com/<locale>/`. */
  readonly helpPath?: string;
  /** Offered in place of `uiNextStep` when the run has the tool. */
  readonly toolOffers: readonly GuideToolOffer[];
  readonly uiNextStep: string;
}

const KNOWLEDGE_BASES: FeatureGuide = {
  page: `"Knowledge" / "Wissen"`,
  plural: 'knowledge bases',
  createPermission: {
    permission: Permission.MANAGE_KNOWLEDGE_BASES,
    otherwise: `The user's role may not create knowledge bases. Don't walk them through creating one: explain what knowledge bases can do for them and tell them to ask an administrator to share a knowledge base with them or to give them permission to create their own.`,
  },
  facts: `A knowledge base ("Wissenssammlung") is a collection of documents and websites. Ayunis Core searches it when answering, so answers draw on the user's own material, such as bylaws, guidelines, forms or FAQs, instead of general knowledge.
1. On the "Knowledge" / "Wissen" page in the sidebar, click "Add Knowledge Base" / "Wissenssammlung hinzufügen" and enter a name and a description. A good description helps Ayunis Core decide when to use it.
2. Open the knowledge base and add content under "Documents" / "Dokumente": "Upload" / "Hochladen" files (PDF, DOCX, PPTX, ODT, ODP, CSV, XLSX, XLS, ODS, TXT, EML, MSG and audio) or "Add URL" / "URL hinzufügen" to import a website.
3. While it is "Active" / "Aktiv", it is available in the user's chats. It can also be attached to a single chat with "Add Knowledge Base" / "Wissenssammlung hinzufügen" in the chat input.
A knowledge base can also be created inside a workspace, where it serves every chat of that workspace.`,
  helpPath: 'knowledge-collections/',
  toolOffers: [],
  uiNextStep: `You cannot create a knowledge base from this chat. Suggest a first knowledge base for their use case: a name, a description and which documents or websites to add. Then point them to "Add Knowledge Base" / "Wissenssammlung hinzufügen" on the "Knowledge" / "Wissen" page.`,
};

const SKILLS: FeatureGuide = {
  page: `"Skills" / "Fähigkeiten"`,
  plural: 'skills',
  createPermission: {
    permission: Permission.MANAGE_SKILLS,
    otherwise: `The user's role may not create skills of their own. Don't offer to draft one: explain what skills can do for them and tell them to ask an administrator to share a skill with them or to give them permission to create their own.`,
  },
  facts: `A skill ("Fähigkeit") holds the instructions for a recurring task, such as answering citizen enquiries or drafting a statement, so the user does not have to explain the task again in every chat. It can also bring knowledge bases, files and integrations.
1. On the "Skills" / "Fähigkeiten" page, "Add Skill" / "Fähigkeit hinzufügen" offers "Create with Ayunis Core" / "Mit Ayunis Core erstellen" (a chat that builds the skill with them), "Create it yourself" / "Selbst erstellen" and, where available, "Add from the marketplace" / "Aus dem Marketplace hinzufügen".
2. A skill has a "Name", a "Trigger" / "Auslöser" that describes when Ayunis Core should use it, and "Detailed Instructions" / "Detaillierte Anweisungen".
3. While a skill is "Active" / "Aktiv", Ayunis Core uses it on its own whenever a request matches its trigger, so in a new chat the user only has to describe the task. "Pin to new chat" / "An neuen Chat anheften" puts it on the new chat page to start it with one click.`,
  helpPath: 'skills/',
  toolOffers: [
    {
      tool: ToolType.CREATE_SKILL,
      offer: `Offer to build their first skill right here. Draft it together: a name, a short description that says when the skill should be used, and the instructions to follow. Show the draft, refine it until they are happy, then create it with ${ToolType.CREATE_SKILL}. It shows the user a card on which they confirm the creation, so ask them to confirm there.`,
    },
    {
      tool: ToolType.MARKETPLACE_SEARCH,
      offer: `If a ready-made skill could fit their task, look for one with ${ToolType.MARKETPLACE_SEARCH} and offer to install it with ${ToolType.INSTALL_MARKETPLACE_SKILL}.`,
    },
  ],
  uiNextStep: `Suggest a concrete first skill for their task: a name, a trigger and the core of its instructions. Then point them to "Add Skill" / "Fähigkeit hinzufügen" on the "Skills" / "Fähigkeiten" page.`,
};

const WORKSPACES: FeatureGuide = {
  page: `"Workspaces" / "Arbeitsbereiche"`,
  plural: 'workspaces',
  facts: `A workspace ("Arbeitsbereich") groups the chats about one topic or project, together with what those chats share: instructions added to every chat in it, and its own knowledge bases and skills. Colleagues added as members share the instructions, skills and knowledge; each member's chats stay private.
1. On the "Workspaces" / "Arbeitsbereiche" page, click "Add workspace" / "Arbeitsbereich hinzufügen" and fill in "What are you working on?" / "Woran arbeiten Sie?" and, optionally, "What do you want to achieve?" / "Was möchten Sie erreichen?", an icon and a color.
2. In the workspace, set it up in its tabs: "Instructions" / "Anweisungen", "Knowledge" / "Wissen" and "Skills" / "Fähigkeiten". Add colleagues under "Members" / "Mitglieder".
3. Start chats directly in the workspace, or move an existing chat there with "Add to workspace" / "Zu Arbeitsbereich hinzufügen" in the chat's menu in the sidebar.`,
  helpPath: 'workspaces/',
  toolOffers: [],
  uiNextStep: `You cannot create a workspace from this chat. Suggest a first workspace for their use case: a name, what its instructions should say and which documents belong in its knowledge. Then point them to "Add workspace" / "Arbeitsbereich hinzufügen" on the "Workspaces" / "Arbeitsbereiche" page.`,
};

const ROUTINES: FeatureGuide = {
  page: `"Routines" / "Routinen"`,
  plural: 'routines',
  flag: FeatureFlag.Routines,
  createPermission: {
    permission: Permission.MANAGE_ROUTINES,
    otherwise: `The user's role does not have the "Manage routines" / "Routinen verwalten" permission. Don't walk them through creating a routine: explain what routines can do for them and tell them to ask an administrator for the permission.`,
  },
  facts: `A routine ("Routine") carries out a task unattended on a schedule at a fixed time: daily, on chosen weekdays (such as every Monday, or Monday to Friday) or monthly on one day (the 1st to the 28th, or the last day of the month). Typical uses are a morning briefing, a weekly look at a website, or watching an official gazette for news. Other schedules, such as every two weeks, the first Monday of the month or several times a day, are not possible. A routine works without the user: all it has is its task description and what it is allowed to use (the internet, integrations, knowledge bases).
1. On the "Routines" / "Routinen" page, click "New routine" / "Neue Routine" (on the empty page: "Create your first routine" / "Erste Routine erstellen") and pick "Blank routine" / "Leere Routine". Where a marketplace is set up, "From the marketplace" / "Aus dem Marketplace" opens ready-made routines there instead.
2. Fill in "Name", the "Task" / "Aufgabe" it carries out on every run and the "Schedule" / "Zeitplan": "Daily" / "Täglich", "Weekly" / "Wöchentlich" with the weekdays, or "Monthly" / "Monatlich" with the day, and the time (German time). Then "Create" / "Erstellen"; the routine's page opens.
3. If it needs the web, choose under "Internet access" / "Internetzugriff" "All websites" / "Alle Websites" or "Only these domains" / "Nur diese Domains" with the allowed domains, and "Save" / "Speichern". In the "Context" / "Kontext" card, switch on the integrations and knowledge bases it may use; each switch saves at once.
4. "Run now" / "Jetzt ausführen" tries it out right away, and the switch next to it turns the schedule on or off. Each run creates a chat, and what is relevant arrives in the "Inbox" / "Posteingang".`,
  toolOffers: [
    {
      tool: ToolType.CREATE_ROUTINE,
      offer: `Offer to set up their first routine right here with ${ToolType.CREATE_ROUTINE}: agree on a name, a self-contained task description (each run starts without this conversation), the schedule (daily, weekly on chosen weekdays, or monthly on one day, at a time) and the internet access it needs (none, any website, or only certain domains). It shows the user a card on which they confirm the creation, so ask them to confirm there.`,
    },
  ],
  uiNextStep: `Suggest a concrete first routine for their use case: a name, the task description and the schedule. Then point them to "New routine" / "Neue Routine" on the "Routines" / "Routinen" page.`,
};

const RECORDINGS: FeatureGuide = {
  page: `"Meetings" / "Besprechungen"`,
  plural: 'meetings',
  flag: FeatureFlag.Recordings,
  createPermission: {
    permission: Permission.MANAGE_RECORDINGS,
    otherwise: `The user's role may not create meetings. Don't walk them through creating one: explain that meetings of their teams and organization appear on the page and can be searched in chats, and tell them to ask an administrator for permission to create their own.`,
  },
  facts: `A meeting ("Besprechung") holds the audio recording of a meeting, such as a council or team meeting. Ayunis Core transcribes it with speaker labels and generates the minutes as a summary. In chats, Ayunis Core can search the meetings the user has access to and answer questions about what was discussed or decided.
1. On the "Meetings" / "Besprechungen" page, click "Add Meeting" / "Besprechung hinzufügen", enter a "Name", choose who it belongs to (the user, one of their teams or the organization) and add the "Audio file" / "Audiodatei" (MP3, M4A, WAV or WebM).
2. Once it is processed, the meeting shows its "Transcript" / "Transkript" and its "Summary" / "Zusammenfassung".
3. In any chat, the user can ask about their meetings, for example for the decisions or open tasks of a meeting. A workspace can also hold its own meetings.`,
  toolOffers: [],
  uiNextStep: `You cannot create a meeting from this chat. Ask which meeting they want to capture and what they need from it, such as minutes, decisions or tasks. Then point them to "Add Meeting" / "Besprechung hinzufügen" on the "Meetings" / "Besprechungen" page.`,
};

export const FEATURE_GUIDES: Readonly<Record<GuideFeature, FeatureGuide>> = {
  [GuideFeature.KNOWLEDGE_BASES]: KNOWLEDGE_BASES,
  [GuideFeature.SKILLS]: SKILLS,
  [GuideFeature.WORKSPACES]: WORKSPACES,
  [GuideFeature.ROUTINES]: ROUTINES,
  [GuideFeature.RECORDINGS]: RECORDINGS,
};
