import type { CSSProperties } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { cn } from '@ayunis/ui/lib/cn';

const i = (index: number) => ({ '--i': index }) as CSSProperties;

function Lines({ widths }: Readonly<{ widths: number[] }>) {
  return (
    <div className="wp-panel-lines">
      {widths.map((width, index) => (
        <span
          key={`${width}-${index}`}
          style={{ ...i(index), width: `${width}%` }}
        />
      ))}
    </div>
  );
}

function DocumentBody() {
  return (
    <div className="wp-panel-doc">
      <span className="wp-panel-doc__title" />
      <Lines widths={[100, 94, 98, 60]} />
      <Lines widths={[100, 90, 96, 76]} />
      <Lines widths={[45]} />
    </div>
  );
}

const SHEET_ROWS = [
  ['B-2026-114', 'Lindenweg 12', 'In Prüfung'],
  ['B-2026-118', 'Schulstraße 3', 'Genehmigt'],
  ['B-2026-121', 'Am Markt 7', 'Unterlagen fehlen'],
  ['B-2026-125', 'Ringstraße 20', 'In Prüfung'],
];

function SpreadsheetBody() {
  return (
    <table className="wp-panel-table">
      <thead>
        <tr>
          <th>Aktenzeichen</th>
          <th>Adresse</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {SHEET_ROWS.map((row, index) => (
          <tr key={row[0]} style={i(index)}>
            {row.map((cell) => (
              <td key={cell}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ArtifactPanel({
  kind,
  title,
  highlightExports,
}: Readonly<{
  kind: 'document' | 'spreadsheet';
  title: string;
  highlightExports: boolean;
}>) {
  const exports = kind === 'document' ? ['PDF', 'Word'] : ['Excel', 'CSV'];

  return (
    <div className="wp-demo__panel-inner">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <span className="truncate text-sm font-medium">{title}</span>
        <div className={cn('flex gap-1', highlightExports && 'wp-spot')}>
          {exports.map((format) => (
            <Button key={format} variant="outline" size="xs">
              <Download />
              {format}
            </Button>
          ))}
        </div>
      </div>
      <div className="wp-result p-5">
        {kind === 'document' ? <DocumentBody /> : <SpreadsheetBody />}
      </div>
    </div>
  );
}
