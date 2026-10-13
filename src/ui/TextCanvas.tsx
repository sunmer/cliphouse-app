import {ArrowDown, ArrowUp, Check, ListPlus, Plus, Trash2, X} from 'lucide-react';
import {useCallback, useEffect, useRef, useState, type ClipboardEvent as ReactClipboardEvent, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject} from 'react';
import {flushSync} from 'react-dom';
import {ROLES, roleError, roleHint, type Role, type VideoProps} from '../videos/vocab';
import {groupOf, listItems, listLabel, listProblems, listRoles, type ListGroup} from '../poc/lists';
import type {VideoPlayerRef} from './VideoPlayer';

type Target = {role: Role; item: number | null; left: number; top: number; width: number; height: number; fontFamily: string; fontWeight: string; rects: DOMRect[]};
/** One row of the list editor. `origin` is the item's index in the saved list, or null for a new row. */
type Row = {key: number; text: string; origin: number | null};

const offsetRect = (rect: DOMRect, x: number, y: number) => new DOMRect(rect.left + x, rect.top + y, rect.width, rect.height);

// Read glyph bounds, not container bounds: animated text can span many nested elements.
function targetsIn(root: HTMLElement, source: HTMLElement | Document = root): Target[] {
  const origin = root.getBoundingClientRect();
  const doc = source.nodeType === Node.DOCUMENT_NODE ? source as Document : (source as HTMLElement).ownerDocument;
  const frame = doc.defaultView?.frameElement?.getBoundingClientRect();
  const page = doc.documentElement;
  if (!page) return [];
  const scaleX = frame && page.clientWidth ? frame.width / page.clientWidth : 1;
  const scaleY = frame && page.clientHeight ? frame.height / page.clientHeight : 1;
  const place = (rect: DOMRect) => frame ? new DOMRect(frame.left + rect.left * scaleX, frame.top + rect.top * scaleY, rect.width * scaleX, rect.height * scaleY) : offsetRect(rect, 0, 0);
  const result: Target[] = [];
  source.querySelectorAll<HTMLElement>('[data-text-role]').forEach((el) => {
    const role = el.dataset.textRole as Role;
    if (!(role in ROLES)) return;
    const itemAttr = el.closest<HTMLElement>('[data-list-item]')?.dataset.listItem;
    const item = itemAttr === undefined ? null : Number(itemAttr);
    const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const rects: DOMRect[] = [];
    let fragmented = false;
    let style: CSSStyleDeclaration | undefined;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent?.trim()) continue;
      let parent = node.parentElement;
      let visible = true;
      while (parent && parent !== root && parent !== doc.body) {
        const css = doc.defaultView!.getComputedStyle(parent);
        if (css.visibility === 'hidden' || css.display === 'none' || Number(css.opacity) < 0.08) visible = false;
        parent = parent.parentElement;
      }
      if (!visible) continue;
      const range = doc.createRange();
      // Long rotated marquees otherwise report a bounding box covering the whole canvas.
      const chunks = node.textContent.length > 80 ? [...node.textContent.matchAll(/\S+/g)] : null;
      fragmented ||= !!chunks;
      for (const chunk of chunks ?? [null]) {
        if (chunk) {
          range.setStart(node, chunk.index!);
          range.setEnd(node, chunk.index! + chunk[0].length);
        } else range.selectNodeContents(node);
        for (const raw of range.getClientRects()) {
          const rect = place(raw);
          if (rect.width > 1 && rect.height > 1 && rect.right > origin.left && rect.left < origin.right &&
            rect.bottom > origin.top && rect.top < origin.bottom) rects.push(rect);
        }
      }
      style ??= doc.defaultView!.getComputedStyle(node.parentElement!);
    }
    if (!rects.length) return;
    for (const group of fragmented ? rects.map((rect) => [rect]) : [rects]) {
      const left = Math.max(origin.left, Math.min(...group.map((r) => r.left)));
      const top = Math.max(origin.top, Math.min(...group.map((r) => r.top)));
      const right = Math.min(origin.right, Math.max(...group.map((r) => r.right)));
      const bottom = Math.min(origin.bottom, Math.max(...group.map((r) => r.bottom)));
      result.push({role, item, left: left - origin.left, top: top - origin.top, width: right - left, height: bottom - top,
        fontFamily: style?.fontFamily ?? 'inherit', fontWeight: style?.fontWeight ?? '600', rects: group});
    }
  });
  return result;
}

export function TextCanvas({ref, children, player, props, playing, onCommit, onEditing, lists = [], onCommitList}: {
  ref?: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  player: RefObject<VideoPlayerRef | null>;
  props: VideoProps;
  playing: boolean;
  onCommit: (role: Role, value: string) => void;
  onEditing: (role: Role | null) => void;
  /** Declared list groups. Tapping any member opens the whole list as one item per line. */
  lists?: ListGroup[];
  onCommitList?: (group: ListGroup, items: string[]) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const setRoot = useCallback((node: HTMLDivElement | null) => {
    root.current = node;
    if (ref) ref.current = node;
  }, [ref]);
  const input = useRef<HTMLTextAreaElement>(null);
  const rowInputs = useRef(new Map<number, HTMLInputElement>());
  const nextKey = useRef(0);
  const [targets, setTargets] = useState<Target[]>([]);
  const [active, setActive] = useState<Target | null>(null);
  const [draft, setDraft] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [focusRow, setFocusRow] = useState(0);
  // Focus a row after React renders it; `caret` places the caret at the start or the end.
  const pendingFocus = useRef<{key: number; caret: 'start' | 'end'} | null>(null);
  const group = active ? groupOf(lists, active.role) : undefined;
  const [size, setSize] = useState({width: 0, height: 0});
  const [viewport, setViewport] = useState({top: 0, bottom: Infinity});
  const measure = useCallback(() => {
    if (!root.current) return;
    const next = targetsIn(root.current, player.current?.textRoot() ?? root.current);
    setTargets(next);
    setSize({width: root.current.clientWidth, height: root.current.clientHeight});
    const bounds = root.current.getBoundingClientRect();
    const view = window.visualViewport;
    setViewport({top: (view?.offsetTop ?? 0) - bounds.top, bottom: (view ? view.offsetTop + view.height : innerHeight) - bounds.top});
    setActive((a) => a ? next.filter((t) => t.role === a.role)
      .sort((x, y) => Math.abs(x.left - a.left) + Math.abs(x.top - a.top) - Math.abs(y.left - a.left) - Math.abs(y.top - a.top))[0] ?? a : null);
  }, [player]);

  useEffect(() => {
    const want = pendingFocus.current;
    if (!want) return;
    pendingFocus.current = null;
    const el = rowInputs.current.get(want.key);
    if (!el) return;
    el.focus({preventScroll: true});
    const at = want.caret === 'start' ? 0 : el.value.length;
    el.setSelectionRange(at, at);
  });

  useEffect(() => {
    let frame = 0;
    let disposed = false;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    if (root.current) observer.observe(root.current);
    if (!playing) schedule();
    void document.fonts.ready.then(() => { if (!disposed) schedule(); });
    const p = player.current;
    p?.addEventListener('seeked', schedule);
    p?.addEventListener('pause', schedule);
    p?.addEventListener('ready', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    return () => {
      disposed = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
      p?.removeEventListener('seeked', schedule);
      p?.removeEventListener('pause', schedule);
      p?.removeEventListener('ready', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
    };
  }, [playing, props, measure, player]);

  const begin = (target: Target) => {
    player.current?.pause();
    const g = groupOf(lists, target.role);
    const saved = g ? listItems(g, props) : [];
    const shownRoles = g && g.storage.kind === 'roles' ? listRoles(g).slice(0, saved.length) : [];
    // The tapped item: its data-list-item index, or its role's place in a role-per-item list.
    const selected = !g ? 0 : g.storage.kind === 'packed' ? target.item ?? 0 : Math.max(0, shownRoles.indexOf(target.role));
    const start = saved.map((text, i): Row => ({key: nextKey.current++, text, origin: i}));
    // Synchronous focus keeps the keyboard gesture valid on iOS.
    flushSync(() => {
      setActive(target);
      setDraft(g ? '' : props.texts[target.role] ?? '');
      setRows(start);
      setFocusRow(Math.min(selected, Math.max(0, start.length - 1)));
      if (root.current) setSize({width: root.current.clientWidth, height: root.current.clientHeight});
      onEditing(target.role);
    });
    if (g) {
      const row = start[Math.min(selected, start.length - 1)];
      const el = row ? rowInputs.current.get(row.key) : undefined;
      el?.focus({preventScroll: true});
      el?.setSelectionRange(el.value.length, el.value.length);
    } else {
      input.current?.focus({preventScroll: true});
      input.current?.select();
    }
  };
  const items = group ? rows.map((r) => r.text.trim()) : [];
  const problems = group ? listProblems(group, items) : [];
  const listProblem = problems[0]?.message.replace(/^Line (\d+)/, 'Item $1') ?? null;
  const problem = group ? listProblem : active ? roleError(active.role, draft) : null;
  const valid = active && !problem;
  const finish = (save: boolean) => {
    if (save && !valid) return;
    if (save && group) {
      if (items.join('\n') !== listItems(group, props).join('\n')) onCommitList?.(group, items);
    } else if (save && active && draft !== props.texts[active.role]) onCommit(active.role, draft.trim());
    setActive(null);
    onEditing(null);
    root.current?.focus({preventScroll: true});
  };
  // Removed items keep their text, so they can come back within the list's capacity.
  const removed = group && group.storage.kind === 'roles'
    ? listRoles(group).slice(listItems(group, props).length).map((r) => props.texts[r] ?? '').filter(Boolean) : [];
  const restorable = removed.slice(0, Math.max(0, (group?.max ?? 0) - items.length)).filter((t) => !items.includes(t));

  // List row editing. Every change stays in the draft until the list is saved as one edit.
  const focusKey = (key: number, caret: 'start' | 'end' = 'end') => { pendingFocus.current = {key, caret}; };
  const canAdd = !!group && rows.length < group.max;
  const canRemove = !!group && rows.length > Math.max(1, group.min);
  const setRowText = (i: number, text: string) => setRows((rs) => rs.map((r, k) => k === i ? {...r, text: text.replace(/[\r\n]+/g, ' ')} : r));
  const addRow = (after: number, text = '') => {
    if (!canAdd) return;
    const row: Row = {key: nextKey.current++, text, origin: null};
    setRows((rs) => [...rs.slice(0, after + 1), row, ...rs.slice(after + 1)]);
    setFocusRow(after + 1);
    focusKey(row.key);
  };
  const removeRow = (i: number) => {
    if (!canRemove) return;
    const next = rows.filter((_, k) => k !== i);
    setRows(next);
    const to = Math.max(0, Math.min(i - 1, next.length - 1));
    setFocusRow(to);
    if (next[to]) focusKey(next[to].key);
  };
  const moveRow = (i: number, by: -1 | 1) => {
    const j = i + by;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    setRows(next);
    setFocusRow(j);
    focusKey(next[j].key);
  };
  const goRow = (i: number, caret: 'start' | 'end' = 'end') => {
    if (!rows[i]) return;
    setFocusRow(i);
    focusKey(rows[i].key, caret);
    // Focus now as well: no state change may follow to trigger a render.
    const el = rowInputs.current.get(rows[i].key);
    if (el) { pendingFocus.current = null; el.focus({preventScroll: true}); const at = caret === 'start' ? 0 : el.value.length; el.setSelectionRange(at, at); }
  };
  const onRowKey = (i: number, e: ReactKeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.nativeEvent.isComposing) return;
    const mod = e.metaKey || e.ctrlKey;
    if (e.key === 'Escape') { e.preventDefault(); finish(false); return; }
    if (e.key === 'Enter' && mod) { e.preventDefault(); finish(true); return; }
    if (e.key === 'Enter') {
      // Enter adds a row after the last one while there is room; elsewhere it moves to the next row.
      e.preventDefault();
      if (i === rows.length - 1) addRow(i); else goRow(i + 1);
      return;
    }
    if (e.key === 'Backspace' && !rows[i].text && canRemove) { e.preventDefault(); removeRow(i); return; }
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.altKey) { e.preventDefault(); moveRow(i, e.key === 'ArrowUp' ? -1 : 1); return; }
    if (e.key === 'ArrowUp' && i > 0) { e.preventDefault(); goRow(i - 1); }
    if (e.key === 'ArrowDown' && i < rows.length - 1) { e.preventDefault(); goRow(i + 1); }
  };
  // Pasting several lines fills this row and adds the rest as new rows. Over the limit, the error shows.
  const onRowPaste = (i: number, e: ReactClipboardEvent<HTMLInputElement>) => {
    const lines = e.clipboardData.getData('text').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    if (lines.length < 2) return;
    e.preventDefault();
    const el = e.currentTarget;
    const head = el.value.slice(0, el.selectionStart ?? el.value.length);
    const added = lines.slice(1).map((text): Row => ({key: nextKey.current++, text, origin: null}));
    setRows((rs) => [...rs.slice(0, i), {...rs[i], text: head + lines[0]}, ...added, ...rs.slice(i + 1)]);
    setFocusRow(i + added.length);
    focusKey(added[added.length - 1].key);
  };
  const badLines = new Set(problems.map((p) => p.line).filter((l): l is number => l !== undefined));

  // The list editor sits beside the list, so the selected item stays visible in the video.
  const listTargets = group ? targets.filter((t) => listRoles(group).includes(t.role)) : [];
  const selectedOrigin = group ? rows[focusRow]?.origin ?? null : null;
  const selectedTargets = selectedOrigin === null ? [] : group?.storage.kind === 'packed'
    ? listTargets.filter((t) => t.item === selectedOrigin)
    : listTargets.filter((t) => t.role === listRoles(group!)[selectedOrigin]);
  const width = active ? Math.min(Math.max(active.width + 16, group ? 380 : 220), Math.max(1, size.width - 16), group ? 460 : Infinity) : 0;
  const availableTop = Math.max(8, viewport.top + 8);
  const availableBottom = Math.min(size.height - 8, viewport.bottom - 8);
  // The list editor may leave the video canvas: beside it on a wide page, so the video stays fully visible.
  // Keep clear of the editor's side rail (76px) on the right.
  const pageRight = typeof window === 'undefined' ? size.width : window.innerWidth - (root.current?.getBoundingClientRect().left ?? 0) - 84;
  const pageLeft = -(root.current?.getBoundingClientRect().left ?? 0) + 8;
  const ROW_H = 44;
  const listRowsHeight = group ? Math.min(ROW_H * Math.max(1, rows.length) + 8, Math.max(ROW_H + 8, availableBottom - availableTop - 92)) : 0;
  const height = active && !group ? Math.min(Math.max(active.height + 12, 60), Math.max(60, Math.min(260, availableBottom - availableTop - 48))) : 0;
  const boxHeight = group ? listRowsHeight + 92 : height + 48;
  const spanOf = (ts: Target[]) => ts.length ? {top: Math.min(...ts.map((t) => t.top)), bottom: Math.max(...ts.map((t) => t.top + t.height))} : null;
  const span = spanOf(listTargets);
  // When the whole list cannot stay visible, keep at least the selected item clear of the editor.
  const focusSpan = spanOf(selectedTargets) ?? spanOf(listTargets.filter((t) => t.item === focusRow));
  let top = active ? Math.max(availableTop, Math.min(active.top - 6, availableBottom - boxHeight)) : 0;
  if (group && span) {
    if (span.bottom + 12 + boxHeight <= availableBottom) top = span.bottom + 12;
    else if (span.top - 12 - boxHeight >= availableTop) top = span.top - 12 - boxHeight;
    else {
      const s = focusSpan ?? span;
      // Keep the selected item clear: below it when the editor fits there, else above it, else the larger side.
      const below = s.bottom + 8, above = s.top - 8 - boxHeight;
      top = below + boxHeight <= availableBottom ? below : above >= availableTop ? above
        : s.top - availableTop > availableBottom - s.bottom ? Math.max(availableTop, above) : Math.min(below, Math.max(availableTop, availableBottom - boxHeight));
    }
  }
  let left = active ? Math.max(8, Math.min((group ? Math.min(...listTargets.map((t) => t.left), active.left) : active.left) - 8, size.width - width - 8)) : 0;
  // Wide canvas, tall list: put the editor beside the list when it fits there, so every item stays visible.
  if (group && span && listTargets.length) {
    const covered = !(top + boxHeight <= span.top - 8 || top >= span.bottom + 8);
    const listLeft = Math.min(...listTargets.map((t) => t.left)), listRight = Math.max(...listTargets.map((t) => t.left + t.width));
    const sideTop = Math.max(availableTop, Math.min(span.top, Math.max(availableTop, viewport.bottom - 8 - boxHeight)));
    if (covered && listRight + 12 + width <= size.width - 8) { left = listRight + 12; top = sideTop; }
    else if (covered && listLeft - 12 - width >= 8) { left = listLeft - 12 - width; top = sideTop; }
    else if (covered && size.width + 12 + width <= pageRight) { left = size.width + 12; top = sideTop; }
    else if (covered && -12 - width >= pageLeft) { left = -12 - width; top = sideTop; }
  }
  const label = group ? listLabel(group) : active ? ROLES[active.role].label : '';
  // While the video plays, the hit targets are not rendered and the player iframe owns the cursor.
  // Track hover over live text so the text cursor and a hint still show that text is editable.
  const [hovering, setHovering] = useState(false);
  const hoverFrame = useRef(0);
  const onHover = (event: ReactPointerEvent) => {
    if (!playing || active || !root.current) { if (hovering) setHovering(false); return; }
    const {clientX: x, clientY: y} = event;
    cancelAnimationFrame(hoverFrame.current);
    hoverFrame.current = requestAnimationFrame(() => {
      if (!root.current) return;
      const hit = targetsIn(root.current, player.current?.textRoot() ?? root.current).some((t) => t.rects.some((r) =>
        x >= r.left - 4 && x <= r.right + 4 && y >= r.top - 4 && y <= r.bottom + 4));
      setHovering(hit);
    });
  };
  return (
    <div ref={setRoot} className={`text-canvas ${active ? 'is-editing' : ''} ${hovering ? 'over-text' : ''}`} tabIndex={-1}
      onPointerMove={onHover} onPointerLeave={() => setHovering(false)}
      onClickCapture={(event) => {
        if ((event.target as Element).closest('.inline-editor, .text-hit')) return;
        if (active) { finish(true); return; }
        const candidates = targetsIn(root.current!, player.current?.textRoot() ?? root.current!).filter((t) => t.rects.some((r) =>
          event.clientX >= r.left - 4 && event.clientX <= r.right + 4 && event.clientY >= r.top - 4 && event.clientY <= r.bottom + 4));
        const target = candidates.sort((a, b) => a.width * a.height - b.width * b.height)[0];
        if (target) {
          event.preventDefault();
          event.stopPropagation();
          begin(target);
        }
      }}>
      {children}
      {/* The player's iframe swallows pointer events; this layer keeps hover and click on the canvas. */}
      {!active && <div className="text-capture" aria-hidden="true" />}
      {!playing && !active && <div className="text-targets">
        {targets.map((target, i) => (
          <button key={`${target.role}-${i}`} type="button" className="text-hit"
            aria-label={`Edit ${ROLES[target.role].label}`} title={`Edit ${ROLES[target.role].label}`}
            style={{left: target.left, top: target.top, width: target.width, height: Math.max(24, target.height)}}
            onClick={() => begin(target)} />
        ))}
      </div>}
      {active && selectedTargets.map((t, i) => (
        <div key={i} className="list-focus" aria-hidden="true" style={{left: t.left - 6, top: t.top - 4, width: t.width + 12, height: t.height + 8}} />
      ))}
      {active && group && <div className="inline-editor list-editor" role="group" aria-label={`Edit ${label}`} style={{left, top, width}}>
        <div className="list-head">
          <span className={!valid ? 'error' : ''}>{label}</span>
          <span className="counter" aria-label={`${rows.length} items, ${group.min} to ${group.max} allowed`}>{rows.length}/{group.max} · min {group.min}</span>
        </div>
        <ol className="list-rows" style={{maxHeight: listRowsHeight}}>
          {rows.map((row, i) => {
            const len = row.text.trim().length;
            return (
              <li key={row.key} className={`list-row ${i === focusRow ? 'selected' : ''}`}>
                <span className="list-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <input ref={(el) => { if (el) rowInputs.current.set(row.key, el); else rowInputs.current.delete(row.key); }}
                  aria-label={`${label} ${i + 1}`} aria-invalid={badLines.has(i + 1)} value={row.text} enterKeyHint={i === rows.length - 1 && canAdd ? 'enter' : 'next'}
                  onFocus={() => setFocusRow(i)} onChange={(e) => setRowText(i, e.target.value)}
                  onKeyDown={(e) => onRowKey(i, e)} onPaste={(e) => onRowPaste(i, e)} />
                <span className={`counter row-count ${len > group.itemMax ? 'error' : ''}`} title={`${len} of ${group.itemMax} characters`}>{len}/{group.itemMax}</span>
                <button type="button" className="icon-btn row-btn" title="Move up" aria-label={`Move item ${i + 1} up`} disabled={i === 0}
                  onClick={() => moveRow(i, -1)}><ArrowUp size={15} /></button>
                <button type="button" className="icon-btn row-btn" title="Move down" aria-label={`Move item ${i + 1} down`} disabled={i === rows.length - 1}
                  onClick={() => moveRow(i, 1)}><ArrowDown size={15} /></button>
                <button type="button" className="icon-btn row-btn" title="Delete item" aria-label={`Delete item ${i + 1}`} disabled={!canRemove}
                  onClick={() => removeRow(i)}><Trash2 size={15} /></button>
              </li>
            );
          })}
        </ol>
        <div className="inline-actions">
          <span className={!valid ? 'error' : ''} role={problem ? 'alert' : undefined}>{problem ?? ''}</span>
          {canAdd && <button type="button" className="icon-btn" title="Add item" aria-label="Add item" onClick={() => addRow(rows.length - 1)}><Plus size={17} /></button>}
          {restorable.length > 0 && <button type="button" className="icon-btn" title="Restore removed items" aria-label="Restore removed items"
            onClick={() => { const add = restorable.map((text): Row => ({key: nextKey.current++, text, origin: null})); setRows([...rows, ...add]); focusKey(add[add.length - 1].key); }}><ListPlus size={17} /></button>}
          <button type="button" className="icon-btn" title="Cancel edit" aria-label="Cancel edit" onClick={() => finish(false)}><X size={17} /></button>
          <button type="button" className="icon-btn confirm" title="Save list" aria-label="Save list" disabled={!valid} onClick={() => finish(true)}><Check size={17} /></button>
        </div>
      </div>}
      {active && !group && <div className="inline-editor" role="group" aria-label={`Edit ${label}`} style={{left, top, width}}>
        <textarea ref={input} aria-label={label} aria-invalid={!valid} value={draft}
          enterKeyHint="done"
          style={{height, fontFamily: active.fontFamily, fontWeight: active.fontWeight, fontSize: Math.max(20, Math.min(42, active.height * 0.55))}}
          onChange={(e) => setDraft(e.target.value.replace(/[\r\n]+/g, ' '))}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.nativeEvent.isComposing) return;
            if (e.key === 'Escape') { e.preventDefault(); finish(false); }
            if (e.key === 'Enter') { e.preventDefault(); finish(true); }
          }} />
        <div className="inline-actions">
          <span className={!valid ? 'error' : ''}>{label} <span className="counter">{draft.length}/{ROLES[active.role].max}</span>
            {problem && problem === roleHint(active.role) && <span className="counter"> {problem}</span>}</span>
          <button className="icon-btn" title="Cancel edit" aria-label="Cancel edit" onClick={() => finish(false)}><X size={17} /></button>
          <button className="icon-btn confirm" title="Save text" aria-label="Save text" disabled={!valid} onClick={() => finish(true)}><Check size={17} /></button>
        </div>
      </div>}
    </div>
  );
}
