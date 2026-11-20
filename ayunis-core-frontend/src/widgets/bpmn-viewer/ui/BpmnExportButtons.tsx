import type { RefObject } from 'react';
import type NavigatedViewer from 'bpmn-js/lib/NavigatedViewer';
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import { useTrackProductiveOutcome } from '@/shared/lib/openpanel-outcomes';
import { saveBlobAs } from '@/shared/lib/save-blob-as';
import { showError } from '@/shared/lib/toast';
import { usePiiMasks, resolvePiiTokens } from '@/widgets/markdown';
import {
  resolveXmlText,
  svgToPngBlob,
} from '@/widgets/bpmn-viewer/lib/bpmn-export';

interface BpmnExportButtonsProps {
  readonly xml: string;
  readonly viewerRef: RefObject<NavigatedViewer | null>;
  readonly fileName: string;
}

function safeTitle(input: string): string {
  return input.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'process';
}

export function BpmnExportButtons({
  xml,
  viewerRef,
  fileName,
}: BpmnExportButtonsProps) {
  const { t } = useTranslation('artifacts');
  const masks = usePiiMasks();
  const trackOutcome = useTrackProductiveOutcome();
  const resolve = (text: string) => resolvePiiTokens(text, masks);
  const baseName = safeTitle(fileName);

  const exportBpmn = () => {
    const content = resolveXmlText(xml, resolve);
    saveBlobAs(
      new Blob([content], { type: 'application/xml' }),
      `${baseName}.bpmn`,
    );
    trackOutcome({
      outcome_type: 'visual_downloaded',
      output_type: 'diagram',
      format: 'bpmn',
    });
  };

  const renderSvg = async (): Promise<string | null> => {
    const viewer = viewerRef.current;
    if (!viewer) return null;
    const { svg } = await viewer.saveSVG();
    return resolveXmlText(svg, resolve);
  };

  const exportSvg = async () => {
    const svg = await renderSvg();
    if (!svg) return;
    saveBlobAs(new Blob([svg], { type: 'image/svg+xml' }), `${baseName}.svg`);
    trackOutcome({
      outcome_type: 'visual_downloaded',
      output_type: 'diagram',
      format: 'svg',
    });
  };

  const exportPng = async () => {
    const svg = await renderSvg();
    if (!svg) return;
    saveBlobAs(await svgToPngBlob(svg), `${baseName}.png`);
    trackOutcome({
      outcome_type: 'visual_downloaded',
      output_type: 'diagram',
      format: 'png',
    });
  };

  const run = (action: () => void | Promise<void>) => {
    Promise.resolve()
      .then(action)
      .catch(() => showError(t('bpmn.export.failed')));
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => run(exportBpmn)}>
        <Download className="size-3.5" />
        {t('bpmn.export.bpmn')}
      </Button>
      <Button variant="outline" size="sm" onClick={() => run(exportSvg)}>
        <Download className="size-3.5" />
        {t('bpmn.export.svg')}
      </Button>
      <Button variant="outline" size="sm" onClick={() => run(exportPng)}>
        <Download className="size-3.5" />
        {t('bpmn.export.png')}
      </Button>
    </>
  );
}
