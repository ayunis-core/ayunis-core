import { CreateFileTool } from 'src/domain/tools/domain/tools/create-file-tool.entity';
import { BarChartTool } from 'src/domain/tools/domain/tools/bar-chart-tool.entity';
import { CreateCalendarEventTool } from 'src/domain/tools/domain/tools/create-calendar-event-tool.entity';
import { CreateDocumentTool } from 'src/domain/tools/domain/tools/create-document-tool.entity';
import { CreateRoutineTool } from 'src/domain/tools/domain/tools/create-routine-tool.entity';
import { CreateSkillTool } from 'src/domain/tools/domain/tools/create-skill-tool.entity';
import { EditRoutineTool } from 'src/domain/tools/domain/tools/edit-routine-tool.entity';
import { EditSkillTool } from 'src/domain/tools/domain/tools/edit-skill-tool.entity';
import { FinishRoutineTool } from 'src/domain/tools/domain/tools/finish-routine-tool.entity';
import { InstallMarketplaceSkillTool } from 'src/domain/tools/domain/tools/install-marketplace-skill-tool.entity';
import { InternetSearchTool } from 'src/domain/tools/domain/tools/internet-search-tool.entity';
import { MarketplaceSearchTool } from 'src/domain/tools/domain/tools/marketplace-search-tool.entity';
import { SendEmailTool } from 'src/domain/tools/domain/tools/send-email-tool.entity';
import { ActivateSkillTool } from 'src/domain/tools/domain/tools/activate-skill-tool.entity';
import { UpdateDocumentTool } from 'src/domain/tools/domain/tools/update-document-tool.entity';
import { EditDocumentTool } from 'src/domain/tools/domain/tools/edit-document-tool.entity';
import { UpdateDiagramTool } from 'src/domain/tools/domain/tools/update-diagram-tool.entity';
import { UpdateSpreadsheetTool } from 'src/domain/tools/domain/tools/update-spreadsheet-tool.entity';
import { WebsiteContentTool } from 'src/domain/tools/domain/tools/website-content-tool.entity';
import { OutlookReadEmailTool } from 'src/domain/tools/domain/tools/outlook/outlook-read-email-tool.entity';
import { OutlookReadAttachmentTool } from 'src/domain/tools/domain/tools/outlook/outlook-read-attachment-tool.entity';
import { OutlookDraftEmailTool } from 'src/domain/tools/domain/tools/outlook/outlook-draft-email-tool.entity';
import { OutlookMoveEmailToComposerTool } from 'src/domain/tools/domain/tools/outlook/outlook-move-email-to-composer-tool.entity';
import { OutlookSaveEmailToDraftTool } from 'src/domain/tools/domain/tools/outlook/outlook-save-email-to-draft-tool.entity';
import {
  isAcknowledgementOnlyTool,
  isAwaitingClientResultTool,
  isExternallyHandledTool,
  isHybridArtifactTool,
  requiresExclusiveExecution,
} from './runtime-tool-policy';

describe('runtime tool policy', () => {
  describe(isExternallyHandledTool.name, () => {
    it.each([
      ['send_email', new SendEmailTool()],
      ['create_calendar_event', new CreateCalendarEventTool()],
      ['create_skill', new CreateSkillTool()],
      ['edit_skill', new EditSkillTool()],
      ['install_marketplace_skill', new InstallMarketplaceSkillTool()],
      ['create_routine', new CreateRoutineTool()],
      ['edit_routine', new EditRoutineTool()],
    ])('ends the run with the %s call for the client to handle', (_, tool) => {
      expect(isExternallyHandledTool(tool)).toBe(true);
    });

    it('ends a routine run with its finish_routine call, which has no executor', () => {
      expect(isExternallyHandledTool(new FinishRoutineTool())).toBe(true);
    });

    it('leaves backend-executed tools to their handlers', () => {
      expect(isExternallyHandledTool(new MarketplaceSearchTool())).toBe(false);
      expect(isExternallyHandledTool(new InternetSearchTool())).toBe(false);
    });
  });

  describe('Outlook tools', () => {
    const readTools = [
      new OutlookReadEmailTool(),
      new OutlookReadAttachmentTool(),
    ];
    const writeTools = [
      new OutlookDraftEmailTool(),
      new OutlookMoveEmailToComposerTool(),
      new OutlookSaveEmailToDraftTool(),
    ];

    it.each([...readTools, ...writeTools].map((tool) => [tool.name, tool]))(
      'ends the run with the %s call for the Outlook pane to execute',
      (_, tool) => {
        expect(isExternallyHandledTool(tool)).toBe(true);
      },
    );

    it.each(readTools.map((tool) => [tool.name, tool]))(
      'keeps the %s call open until the pane posts the result the model needs',
      (_, tool) => {
        expect(isAwaitingClientResultTool(tool)).toBe(true);
      },
    );

    it.each(
      [...writeTools, new SendEmailTool(), new FinishRoutineTool()].map(
        (tool) => [tool.name, tool],
      ),
    )('settles the %s call with the placeholder, as today', (_, tool) => {
      expect(isAwaitingClientResultTool(tool)).toBe(false);
    });
  });

  it('classifies chart tools as acknowledgement-only', () => {
    expect(isAcknowledgementOnlyTool(new BarChartTool())).toBe(true);
    expect(isAcknowledgementOnlyTool(new InstallMarketplaceSkillTool())).toBe(
      false,
    );
  });

  it('classifies document tools as hybrid artifact tools', () => {
    expect(isHybridArtifactTool(new CreateDocumentTool())).toBe(true);
    expect(isHybridArtifactTool(new InstallMarketplaceSkillTool())).toBe(false);
  });

  describe(requiresExclusiveExecution.name, () => {
    it.each([
      ['activate_skill', new ActivateSkillTool()],
      ['update_document', new UpdateDocumentTool()],
      ['edit_document', new EditDocumentTool()],
      ['update_diagram', new UpdateDiagramTool()],
      ['update_spreadsheet', new UpdateSpreadsheetTool()],
    ])('runs %s apart from its sibling calls', (_, tool) => {
      expect(requiresExclusiveExecution(tool)).toBe(true);
    });

    it.each([
      ['internet_search', new InternetSearchTool()],
      ['website_content', new WebsiteContentTool()],
      ['create_document', new CreateDocumentTool()],
    ])('lets %s run alongside its sibling calls', (_, tool) => {
      expect(requiresExclusiveExecution(tool)).toBe(false);
    });
  });
});

it('acknowledges create_file without ending the run or creating an artifact', () => {
  const tool = new CreateFileTool();
  expect(isAcknowledgementOnlyTool(tool)).toBe(true);
  expect(isExternallyHandledTool(tool)).toBe(false);
  expect(isHybridArtifactTool(tool)).toBe(false);
});
