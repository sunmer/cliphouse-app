// The list editing contract. A template's list is the packed `list` text role, one item per line.
// The editor, schemas, renderers, and export all read items here, so they agree on every edge case.
import type {VideoProps} from '../vocab.ts';
import type {BeatScore, ListScore} from './score.ts';

/** Editor text to items: one item per line, trimmed, blank lines ignored. */
export const parseLines = (text: string) => text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
export const listItems = (props: Pick<VideoProps, 'texts'>) => parseLines(props.texts.list ?? '');
export const listLabel = (l: ListScore) => l.label ?? 'List items';

const CHART = /^(.*\S)\s+(-?\d+(?:\.\d+)?)([%kKmMbB]?)$/;
export type ChartPoint = {label: string; value: number; display: string};
const UNITS: Record<string, number> = {k: 1e3, m: 1e6, b: 1e9};
/** Parse chart items such as "Q1 12" or "Mar 2.1k" into labeled numbers. */
export const parseChartItems = (items: string[]): ChartPoint[] => items.map((item) => {
  const m = item.match(CHART);
  if (!m) return {label: item, value: 0, display: '0'};
  return {label: m[1], value: Number(m[2]) * (UNITS[m[3].toLowerCase()] ?? 1), display: `${m[2]}${m[3]}`};
});

export type ListProblem = {line?: number; message: string};
/** Every reason a list cannot be saved. Nothing is truncated or dropped silently. */
export function listProblems(l: ListScore, items: readonly string[]): ListProblem[] {
  const out: ListProblem[] = [];
  if (!items.length) out.push({message: 'Add at least one item'});
  else if (items.length < l.min) out.push({message: `Use at least ${l.min} items`});
  if (items.length > l.max) out.push({message: `Use ${l.max} items or fewer`});
  items.forEach((item, i) => {
    if (!item.trim()) out.push({line: i + 1, message: `Line ${i + 1} is empty`});
    if (/[\r\n]/.test(item)) out.push({line: i + 1, message: `Line ${i + 1} has a line break`});
    if (item.length > l.itemMax) out.push({line: i + 1, message: `Line ${i + 1} is ${item.length}/${l.itemMax} characters`});
    if (l.format === 'chart' && !CHART.test(item)) out.push({line: i + 1, message: `Line ${i + 1}: use a label and a number, for example "Q1 12"`});
  });
  return out;
}

/** Errors in stored list text, for schemas. Stored text must already be normalized. */
export function storedListErrors(s: BeatScore, text: string): string[] {
  if (!s.list) return [];
  const items = parseLines(text);
  const errors = listProblems(s.list, items).map((p) => p.message);
  if (items.join('\n') !== text) errors.push('Store one trimmed item per line, with no blank lines');
  return errors;
}

export const applyList = (props: VideoProps, items: readonly string[]): VideoProps => ({...props, texts: {...props.texts, list: items.join('\n')}});
