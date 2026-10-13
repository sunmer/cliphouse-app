// The list editing contract. Kept outside src/videos so existing source packages keep their hashes.
// A template declares its list groups explicitly. Nothing is inferred from role names or commas.
import type {Role, VideoProps} from '../videos/vocab.ts';

/** How a list is stored in props. */
export type ListStorage =
  /** One role per item, in order. Removed items are the last roles, listed in `hidden`; their text is kept. */
  | {kind: 'roles'; roles: Role[]}
  /** One role holds every item, one item per line. */
  | {kind: 'packed'; role: Role};

export type ListGroup = {
  id: string;
  /** Editor label. Defaults to "List items". */
  label?: string;
  storage: ListStorage;
  min: number;
  /** Capacity: the item count of the template's authored default list. */
  max: number;
  /** Longest item in characters. */
  itemMax: number;
  /** `chart` items read "Label 42". */
  format?: 'chart';
};

export const listLabel = (g: ListGroup) => g.label ?? 'List items';
export const listRoles = (g: ListGroup): Role[] => g.storage.kind === 'roles' ? g.storage.roles : [g.storage.role];
export const groupOf = (groups: readonly ListGroup[], role: Role) => groups.find((g) => listRoles(g).includes(role));

const hiddenOf = (props: VideoProps): Role[] => (props as {hidden?: Role[]}).hidden ?? [];

/** Editor text to items: one item per line, trimmed, blank lines ignored. */
export const parseLines = (text: string) => text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);

/** The items the video currently shows, in order. */
export function listItems(g: ListGroup, props: VideoProps): string[] {
  if (g.storage.kind === 'packed') return parseLines(props.texts[g.storage.role] ?? '');
  const hidden = hiddenOf(props);
  return g.storage.roles.filter((r) => !hidden.includes(r)).map((r) => props.texts[r] ?? '');
}

export type ListProblem = {line?: number; message: string};

/** Every reason a list cannot be saved. Nothing is truncated or dropped silently. */
export function listProblems(g: ListGroup, items: readonly string[]): ListProblem[] {
  const out: ListProblem[] = [];
  if (!items.length) out.push({message: 'Add at least one item'});
  else if (items.length < g.min) out.push({message: `Use at least ${g.min} items`});
  if (items.length > g.max) out.push({message: `Use ${g.max} items or fewer`});
  items.forEach((item, i) => {
    if (!item.trim()) out.push({line: i + 1, message: `Line ${i + 1} is empty`});
    if (/[\r\n]/.test(item)) out.push({line: i + 1, message: `Line ${i + 1} has a line break`});
    if (item.length > g.itemMax) out.push({line: i + 1, message: `Line ${i + 1} is ${item.length}/${g.itemMax} characters`});
    if (g.format === 'chart' && !/^(.*\S)\s+-?\d+(?:\.\d+)?[%kKmMbB]?$/.test(item)) out.push({line: i + 1, message: `Line ${i + 1}: use a label and a number, for example "Q1 12"`});
  });
  return out;
}

/** Write items into props as one change. Roles outside the group and every other prop stay as they are. */
export function applyList(g: ListGroup, props: VideoProps, items: readonly string[]): VideoProps {
  const problems = listProblems(g, items);
  if (problems.length) throw new Error(problems[0].message);
  if (g.storage.kind === 'packed') return {...props, texts: {...props.texts, [g.storage.role]: items.join('\n')}};
  const roles = g.storage.roles;
  const texts = {...props.texts};
  items.forEach((item, i) => { texts[roles[i]] = item; });
  const hidden = [...hiddenOf(props).filter((r) => !roles.includes(r)), ...roles.slice(items.length)];
  return {...props, texts, hidden} as VideoProps;
}

/** Errors in stored props: the count and items are within limits, and removed roles are the last ones. */
export function storedListErrors(g: ListGroup, props: VideoProps): string[] {
  const errors = listProblems(g, listItems(g, props)).map((p) => `${listLabel(g)}: ${p.message}`);
  if (g.storage.kind === 'roles') {
    const roles = g.storage.roles;
    const hidden = hiddenOf(props).filter((r) => roles.includes(r));
    const shown = roles.length - hidden.length;
    if (hidden.some((r) => roles.indexOf(r) < shown)) errors.push(`${listLabel(g)}: removed items must be the last ones`);
  }
  return errors;
}
