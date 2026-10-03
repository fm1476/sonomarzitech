const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, character => ENTITIES[character]!);
}

export function money(value: number | string): string {
  return '$' + Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
}
