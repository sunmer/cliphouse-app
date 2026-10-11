// Parsers for structured text roles. The contract validates the format; templates read values here.

/** Split a comma-separated `items` value into trimmed entries. */
export const parseList = (text: string) => text.split(',').map((s) => s.trim()).filter(Boolean);

export type ChartPoint = {label: string; value: number; display: string};

const UNITS: Record<string, number> = {k: 1e3, m: 1e6, b: 1e9};

/** Parse a `chart` value such as "Q1 12, Q2 18.5, Q3 2.1k" into labeled numbers. */
export function parseChart(text: string): ChartPoint[] {
  return parseList(text).map((item) => {
    const m = item.match(/^(.*\S)\s+(-?\d+(?:\.\d+)?)([%kKmMbB]?)$/);
    if (!m) return {label: item, value: 0, display: '0'};
    const unit = m[3].toLowerCase();
    return {label: m[1], value: Number(m[2]) * (UNITS[unit] ?? 1), display: `${m[2]}${m[3]}`};
  });
}

/** Split a stat or price such as "$1,299/mo" into prefix, number, and suffix for count-up animation. */
export function parseNumber(text: string) {
  const m = text.match(/^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (!m) return {prefix: '', value: 0, decimals: 0, suffix: text};
  const digits = m[2].replace(/,/g, '');
  return {prefix: m[1], value: Number(digits), decimals: digits.split('.')[1]?.length ?? 0, suffix: m[3], grouped: m[2].includes(',')};
}

/** Format a count-up frame value with the same prefix, decimals, grouping, and suffix as the source. */
export function formatNumber(n: ReturnType<typeof parseNumber>, t: number) {
  const v = (n.value * t).toFixed(n.decimals);
  const [int, dec] = v.split('.');
  const body = n.grouped ? Number(int).toLocaleString('en-US') : int;
  return `${n.prefix}${body}${dec ? `.${dec}` : ''}${n.suffix}`;
}
