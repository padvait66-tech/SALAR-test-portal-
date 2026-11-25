export function toDDMMYYYY(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;
  }
  const dmyMatch = trimmed.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[1]}-${dmyMatch[2]}-${dmyMatch[3]}`;
  }
  return trimmed;
}

export function toISOYYYYMMDD(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  // Matches 02-02-2026, 02/02/2026, or compact 03-032026
  const dmyMatch = trimmed.match(/^(\d{2})[-/](\d{2})[-/]?(\d{4})$/);
  if (dmyMatch) {
    const [, dd, mm, yyyy] = dmyMatch;
    return `${yyyy}-${mm}-${dd}`;
  }
  return '';
}

export function formatTrialRange(start?: string, end?: string): string {
  const s = toDDMMYYYY(start);
  const e = toDDMMYYYY(end);
  if (s && e) return `${s} to ${e}`;
  return s || e || '';
}

export function parseTrialRangeInput(raw: string): { start: string; end: string } | null {
  const cleaned = raw.trim();
  if (!cleaned) return { start: '', end: '' };
  const parts = cleaned.split(/\s*(?:to|-|–)\s*/i);
  if (parts.length >= 2) {
    // Handle case where "-" was inside DD-MM-YYYY: match two date tokens explicitly
    const matches = cleaned.match(/\d{2}[-/]\d{2}[-/]?\d{4}|\d{4}-\d{2}-\d{2}/g);
    if (matches && matches.length >= 2) {
      const start = toISOYYYYMMDD(matches[0]);
      const end = toISOYYYYMMDD(matches[1]);
      if (start && end) return { start, end };
    }
  }
  const singleMatches = cleaned.match(/\d{2}[-/]\d{2}[-/]?\d{4}|\d{4}-\d{2}-\d{2}/g);
  if (singleMatches && singleMatches.length >= 2) {
    const start = toISOYYYYMMDD(singleMatches[0]);
    const end = toISOYYYYMMDD(singleMatches[1]);
    if (start && end) return { start, end };
  }
  return null;
}
