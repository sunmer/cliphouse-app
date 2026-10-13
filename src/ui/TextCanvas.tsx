import {Check, ListPlus, X} from 'lucide-react';
import {useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject} from 'react';
import {flushSync} from 'react-dom';
import {ROLES, roleError, roleHint, type Role, type VideoProps} from '../videos/vocab';
import {groupOf, listItems, listLabel, listProblems, listRoles, parseLines, type ListGroup} from '../poc/lists';
import type {VideoPlayerRef} from './VideoPlayer';

type Target = {role: Role; left: number; top: number; width: number; height: number; fontFamily: string; fontWeight: string; rects: DOMRect[]};

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
      result.push({role, left: left - origin.left, top: top - origin.top, width: right - left, height: bottom - top,
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
  const [targets, setTargets] = useState<Target[]>([]);
  const [active, setActive] = useState<Target | null>(null);
  const [draft, setDraft] = useState('');
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
    // Synchronous focus keeps the keyboard gesture valid on iOS.
    flushSync(() => {
      setActive(target);
      setDraft(g ? listItems(g, props).join('\n') : props.texts[target.role] ?? '');
      if (root.current) setSize({width: root.current.clientWidth, height: root.current.clientHeight});
      onEditing(target.role);
    });
    input.current?.focus({preventScroll: true});
    if (!g) input.current?.select();
  };
  const items = group ? parseLines(draft) : [];
  const listProblem = group ? listProblems(group, items)[0]?.message ?? null : null;
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
  const width = active ? Math.min(Math.max(active.width + 16, group ? 300 : 220), Math.max(1, size.width - 16)) : 0;
  const left = active ? Math.max(8, Math.min(active.left - 8, size.width - width - 8)) : 0;
  const availableTop = Math.max(8, viewport.top + 8);
  const availableBottom = Math.min(size.height - 8, viewport.bottom - 8);
  const listHeight = group ? 18 + 30 * Math.max(group.max, draft.split('\n').length) : 0;
  const height = active ? Math.min(Math.max(group ? listHeight : active.height + 12, 60), Math.max(60, Math.min(260, availableBottom - availableTop - 48))) : 0;
  const top = active ? Math.max(availableTop, Math.min(active.top - 6, availableBottom - height - 48)) : 0;
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
  // The line under the caret, so its length shows while typing a list item.
  const [caretLine, setCaretLine] = useState(0);
  const lineText = group ? (draft.split('\n')[caretLine] ?? '').trim() : '';
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
      {active && <div className={`inline-editor ${group ? 'list-editor' : ''}`} role="group" aria-label={`Edit ${label}`} style={{left, top, width}}>
        <textarea ref={input} aria-label={label} aria-invalid={!valid} value={draft}
          enterKeyHint={group ? 'enter' : 'done'}
          style={group ? {height, fontSize: 20, lineHeight: '30px'} : {height, fontFamily: active.fontFamily, fontWeight: active.fontWeight, fontSize: Math.max(20, Math.min(42, active.height * 0.55))}}
          onSelect={(e) => { if (group) setCaretLine(e.currentTarget.value.slice(0, e.currentTarget.selectionStart).split('\n').length - 1); }}
          onChange={(e) => {
            setDraft(group ? e.target.value : e.target.value.replace(/[\r\n]+/g, ' '));
            if (group) setCaretLine(e.target.value.slice(0, e.target.selectionStart).split('\n').length - 1);
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.nativeEvent.isComposing) return;
            if (e.key === 'Escape') { e.preventDefault(); finish(false); }
            // In a list, Enter starts a new item; Cmd or Ctrl+Enter saves.
            if (e.key === 'Enter' && (!group || e.metaKey || e.ctrlKey)) { e.preventDefault(); finish(true); }
          }} />
        <div className="inline-actions">
          {group ? <span className={!valid ? 'error' : ''}>{label} <span className="counter">{items.length}/{group.max}</span>
            {!problem && <span className={`counter ${lineText.length > group.itemMax ? 'error' : ''}`}> · line {lineText.length}/{group.itemMax}</span>}
            {problem && <span className="counter"> {problem}</span>}</span>
            : <span className={!valid ? 'error' : ''}>{label} <span className="counter">{draft.length}/{ROLES[active.role].max}</span>
            {problem && problem === roleHint(active.role) && <span className="counter"> {problem}</span>}</span>}
          {restorable.length > 0 && <button className="icon-btn" title="Restore removed items" aria-label="Restore removed items"
            onClick={() => { setDraft([...items, ...restorable].join('\n')); input.current?.focus({preventScroll: true}); }}><ListPlus size={17} /></button>}
          <button className="icon-btn" title="Cancel edit" aria-label="Cancel edit" onClick={() => finish(false)}><X size={17} /></button>
          <button className="icon-btn confirm" title={group ? 'Save list' : 'Save text'} aria-label={group ? 'Save list' : 'Save text'} disabled={!valid} onClick={() => finish(true)}><Check size={17} /></button>
        </div>
      </div>}
    </div>
  );
}
