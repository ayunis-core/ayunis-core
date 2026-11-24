import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import { Checkbox } from '@ayunis/ui/components/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ayunis/ui/components/table';
import type { OparlCatalogBodyResponseDto } from '@ayunis/api-client';
import { SearchField } from '@/shared/ui/search-field';
import { useLinkOparlBodies } from '@/pages/admin-settings/oparl-settings/api/useLinkOparlBodies';
import { useUnlinkOparlBody } from '@/pages/admin-settings/oparl-settings/api/useUnlinkOparlBody';
import { filterBodies } from '@/pages/admin-settings/oparl-settings/lib/filter-bodies';

function BodyRow({
  body,
  selected,
  onSelectedChange,
}: Readonly<{
  body: OparlCatalogBodyResponseDto;
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
}>) {
  const { t } = useTranslation('admin-settings-oparl');
  const unlink = useUnlinkOparlBody();
  const name = body.name ?? t('bodies.unnamed');

  return (
    <TableRow data-testid={`oparl-body-${body.id}`}>
      <TableCell className="w-10">
        {!body.linked && (
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelectedChange(checked === true)}
            aria-label={t('bodies.select', { name })}
            data-testid="oparl-body-select"
          />
        )}
      </TableCell>
      <TableCell>
        <div className="font-medium">{name}</div>
        {body.shortName && body.shortName !== body.name && (
          <div className="text-xs text-muted-foreground">{body.shortName}</div>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {body.systemName ?? '—'}
      </TableCell>
      <TableCell className="text-right">
        {body.linked && (
          <div className="flex items-center justify-end gap-2">
            <Badge variant="secondary" data-testid="oparl-body-linked">
              {t('bodies.linked')}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              disabled={unlink.isPending}
              onClick={() => unlink.mutate(body.id)}
              data-testid="oparl-body-unlink"
            >
              {t('unlink.action')}
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

export function OparlBodiesTable({
  bodies,
}: Readonly<{ bodies: OparlCatalogBodyResponseDto[] }>) {
  const { t } = useTranslation('admin-settings-oparl');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const link = useLinkOparlBodies();
  const visible = useMemo(() => filterBodies(bodies, search), [bodies, search]);
  // Only bodies still offered for linking count, so a body linked meanwhile
  // (or filtered out) is never sent.
  const toLink = visible
    .filter((body) => !body.linked && selected.has(body.id))
    .map((body) => body.id);

  function setBodySelected(bodyId: string, isSelected: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (isSelected) next.add(bodyId);
      else next.delete(bodyId);
      return next;
    });
  }

  function linkSelected() {
    link.mutate(toLink, { onSuccess: () => setSelected(new Set()) });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchField
          data-testid="oparl-bodies-search"
          aria-label={t('bodies.search')}
          placeholder={t('bodies.search')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          wrapperClassName="sm:flex-1"
        />
        <Button
          disabled={toLink.length === 0 || link.isPending}
          onClick={linkSelected}
          data-testid="oparl-bodies-link"
        >
          {t('link.action', { count: toLink.length })}
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <span className="sr-only">{t('bodies.selectColumn')}</span>
            </TableHead>
            <TableHead>{t('bodies.body')}</TableHead>
            <TableHead>{t('bodies.system')}</TableHead>
            <TableHead>
              <span className="sr-only">{t('bodies.status')}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((body) => (
            <BodyRow
              key={body.id}
              body={body}
              selected={selected.has(body.id)}
              onSelectedChange={(isSelected) =>
                setBodySelected(body.id, isSelected)
              }
            />
          ))}
        </TableBody>
      </Table>
      {visible.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">
          {t('bodies.noMatch')}
        </p>
      )}
    </div>
  );
}
