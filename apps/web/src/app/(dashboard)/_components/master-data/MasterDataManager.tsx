'use client';

import {
  MASTER_DATA_PARENT,
  MASTER_DATA_TYPE_LABELS,
  type MasterDataItem,
  type MasterDataType,
} from '@jobbank/shared';
import { ListTree, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, StatusPill } from '@/components/atoms';
import { EmptyState, SearchBar } from '@/components/molecules';
import { DataTable } from '@/components/organisms';
import { MasterDataItemDialog, type ParentOption } from './MasterDataItemDialog';
import { metaSummary, TYPE_SINGULAR } from './labels';

interface Props {
  type: MasterDataType;
  items: MasterDataItem[];
  /** Possible parents (cities for areas, categories for skills). */
  parents: ParentOption[];
}

/** One reference list: searchable table, add and edit dialogs. */
export function MasterDataManager({ type, items, parents }: Props) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<MasterDataItem | null>(null);
  const parentLabel = useMemo(() => new Map(parents.map((p) => [p.id, p.label])), [parents]);
  const parentRule = MASTER_DATA_PARENT[type];

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.code.toLowerCase().includes(q) ||
        (i.parentId && parentLabel.get(i.parentId)?.toLowerCase().includes(q)),
    );
  }, [items, query, parentLabel]);

  const active = items.filter((i) => i.isActive).length;
  const hasDetails = items.some((i) => metaSummary(i) !== null);

  return (
    <>
      <DataTable<MasterDataItem>
        caption={MASTER_DATA_TYPE_LABELS[type]}
        rows={rows}
        getRowId={(i) => i.id}
        onRowClick={setEditing}
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-3">
            <SearchBar
              label={`Search ${MASTER_DATA_TYPE_LABELS[type].toLowerCase()}`}
              placeholder="Search by name or code"
              onSearch={setQuery}
              debounceMs={150}
              className="min-w-48 flex-1 sm:max-w-xs"
            />
            <span className="text-fg-muted text-sm">
              <span className="numeric">{active}</span> active
              {items.length > active && (
                <>
                  {' '}
                  · <span className="numeric">{items.length - active}</span> inactive
                </>
              )}
            </span>
            <MasterDataItemDialog
              key={`new-${type}`}
              type={type}
              parents={parents}
              trigger={
                <Button leftIcon={<Plus />} className="ms-auto">
                  Add {TYPE_SINGULAR[type]}
                </Button>
              }
            />
          </div>
        }
        empty={
          <EmptyState
            icon={ListTree}
            title={query ? 'No matches' : 'Nothing here yet'}
            description={
              query ? 'Try a different search.' : `Add the first ${TYPE_SINGULAR[type]}.`
            }
          />
        }
        columns={[
          {
            id: 'label',
            header: 'Name',
            cell: (i) => (
              <div className="grid">
                <span className="font-medium">{i.label}</span>
                <span className="text-fg-subtle font-mono text-xs [overflow-wrap:anywhere]">
                  {i.code}
                </span>
              </div>
            ),
          },
          ...(parentRule
            ? [
                {
                  id: 'parent',
                  header: parentRule.type === 'CITY' ? 'City' : 'Category',
                  hideBelow: 'sm' as const,
                  cell: (i: MasterDataItem) =>
                    i.parentId ? (parentLabel.get(i.parentId) ?? '—') : '—',
                },
              ]
            : []),
          ...(hasDetails
            ? [
                {
                  id: 'details',
                  header: 'Details',
                  hideBelow: 'md' as const,
                  cell: (i: MasterDataItem) => (
                    <span className="text-fg-muted text-sm">{metaSummary(i) ?? '—'}</span>
                  ),
                },
              ]
            : []),
          {
            id: 'status',
            header: 'Status',
            cell: (i) => (
              <StatusPill
                label={i.isActive ? 'Active' : 'Inactive'}
                tone={i.isActive ? 'success' : 'neutral'}
              />
            ),
          },
        ]}
      />
      {editing && (
        <MasterDataItemDialog
          key={editing.id}
          type={type}
          item={editing}
          parents={parents}
          open
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </>
  );
}
