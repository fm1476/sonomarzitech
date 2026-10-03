import { escapeHtml } from '../utils/html';

type SortState = { key: string | null; dir: 'asc' | 'desc' };
export const SHARED_SORT: Record<string, SortState | undefined> = Object.create(null);

export function sharedSortHeader(tableName: string, label: string, key: string): string {
  if(!SHARED_SORT[tableName]) SHARED_SORT[tableName] = {key:null, dir:'asc'};
  const s = SHARED_SORT[tableName]!;
  const active = s.key===key;
  const arrow = active ? (s.dir==='asc' ? '&#9650;' : '&#9660;') : '&#8597;';
  return `<th class="sortable ${active?'sort-active':''}" data-shared-sort-table="${escapeHtml(tableName)}" data-shared-sort-key="${escapeHtml(key)}">${escapeHtml(label)}<span class="arrow">${arrow}</span></th>`;
}
export function wireSharedSortHeaders(tableName: string, rerenderFn: () => void): void {
  document.querySelectorAll<HTMLElement>('[data-shared-sort-table]').forEach(th=>{
    if(th.dataset.sharedSortTable !== tableName) return;
    th.addEventListener('click', ()=>{
      const key = th.dataset.sharedSortKey;
      const s = SHARED_SORT[tableName];
      if (!s || !key) return;
      if(s.key===key){ s.dir = s.dir==='asc' ? 'desc' : 'asc'; }
      else { s.key = key; s.dir = 'asc'; }
      rerenderFn();
    });
  });
}
export function applySharedSort<T extends object>(tableName: string, list: T[], accessorFn?: (row: T, key: string) => unknown): T[] {
  const state = SHARED_SORT[tableName];
  const key = state?.key;
  if (!state || !key) return list;
  const getValue = accessorFn ?? ((row: T, field: string) => (row as Record<string, unknown>)[field]);
  const direction = state.dir === 'asc' ? 1 : -1;
  return list.slice().sort((a, b) => {
    const av = getValue(a, key) ?? '';
    const bv = getValue(b, key) ?? '';
    if (typeof av === 'number' && typeof bv === 'number') return direction * (av - bv);
    const left = String(av).toLowerCase(), right = String(bv).toLowerCase();
    return direction * (left < right ? -1 : left > right ? 1 : 0);
  });
}
