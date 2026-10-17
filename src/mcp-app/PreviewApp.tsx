import {Check, ExternalLink, Maximize2, Pause, Play} from 'lucide-react';
import {useEffect, useMemo, useRef, useState, type CSSProperties} from 'react';
import {variants} from '../catalog/catalog';
import {validateProps} from '../agent/handoff';
import {compositionFor} from '../videos/registry';
import {VideoPlayer, type VideoPlayerRef} from '../ui/VideoPlayer';
import type {VideoProps} from '../videos/vocab';
import type {Bridge, HostCapabilities} from './bridge';

// One option from render_previews or render_preview (structuredContent.previews).
export type PreviewItem = {id: string; title: string; aspect?: string; editor: string; poster?: string | null; props: unknown};

type Ready = {item: PreviewItem; props: VideoProps; index: number};

function prepare(items: PreviewItem[]) {
  const ready: Ready[] = [];
  const failed: PreviewItem[] = [];
  items.slice(0, 4).forEach((item, index) => {
    const variant = variants.find((v) => v.id === item.id);
    if (!variant) return void failed.push(item);
    try {
      const checked = validateProps(compositionFor(variant.template).schema, item.props);
      if (checked.ok) ready.push({item, props: checked.props, index});
      else failed.push(item);
    } catch { failed.push(item); }
  });
  return {ready, failed};
}

// Live previews: every option plays the real template in the browser, at full resolution and frame rate.
export function PreviewApp({items, bridge, caps}: {items: PreviewItem[]; bridge: Bridge; caps: HostCapabilities}) {
  const {ready, failed} = useMemo(() => prepare(items), [items]);
  const [picked, setPicked] = useState<string | null>(null);
  const open = (url: string) => {
    // Hosts without ui/open-link (or that deny it) still get a normal link click.
    if (caps.openLinks) bridge.openLink(url).catch(() => window.open(url, '_blank', 'noopener'));
    else window.open(url, '_blank', 'noopener');
  };
  const pick = async (r: Ready) => {
    setPicked(r.item.id);
    await bridge.message(`I pick option ${r.index + 1}: ${r.item.title} (${r.item.id}).`).catch(() => {});
  };
  const columns = Math.min(3, Math.max(1, ready.length + failed.length));
  // Several options share one media height, so mixed formats line up in a row.
  return <main className={`mcp-previews${columns > 1 ? ' row' : ''}`} style={{gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`}}>
    {ready.map((r) => <PreviewCard key={r.item.id} ready={r} picked={picked === r.item.id} canPick={Boolean(caps.message)}
      onOpen={() => open(r.item.editor)} onPick={() => pick(r)} />)}
    {failed.map((item) => <article key={item.id} className="mcp-card">
      <div className="mcp-media">{item.poster && <img src={item.poster} alt={item.title} />}</div>
      <footer><span className="mcp-title">{item.title}</span>
        <button type="button" className="mcp-icon" title="Open in the editor" aria-label={`Open ${item.title} in the editor`} onClick={() => open(item.editor)}><ExternalLink size={16} /></button>
      </footer>
    </article>)}
  </main>;
}

function PreviewCard({ready: {item, props, index}, picked, canPick, onOpen, onPick}: {
  ready: Ready; picked: boolean; canPick: boolean; onOpen: () => void; onPick: () => void;
}) {
  const variant = variants.find((v) => v.id === item.id)!;
  const composition = compositionFor(variant.template);
  const player = useRef<VideoPlayerRef>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  // Players mount and play only on screen, so several live players stay light.
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {threshold: 0.2});
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (visible && playing) player.current?.play(); else player.current?.pause();
  }, [visible, playing]);
  const fullscreen = () => frame.current?.requestFullscreen?.().catch(() => {});
  return <article className={`mcp-card${picked ? ' picked' : ''}`}>
    <div ref={frame} className="mcp-media" style={{'--ratio': `${composition.width} / ${composition.height}`} as CSSProperties}>
      {item.poster && <img src={item.poster} alt="" />}
      {visible && <VideoPlayer ref={player} composition={composition} props={props} autoPlay={playing} style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} />}
      <div className="mcp-overlay">
        <button type="button" className="mcp-icon" title={playing ? 'Pause' : 'Play'} aria-label={playing ? `Pause ${item.title}` : `Play ${item.title}`}
          onClick={() => setPlaying((p) => !p)}>
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        {typeof document !== 'undefined' && document.fullscreenEnabled && <button type="button" className="mcp-icon" title="Full screen"
          aria-label={`Show ${item.title} full screen`} onClick={fullscreen}><Maximize2 size={16} /></button>}
      </div>
    </div>
    <footer>
      <span className="mcp-num">{index + 1}</span>
      <span className="mcp-title" title={item.title}>{item.title}</span>
      <button type="button" className="mcp-icon" title="Open in the editor to export the MP4" aria-label={`Open ${item.title} in the editor`} onClick={onOpen}><ExternalLink size={16} /></button>
      {canPick && <button type="button" className={`mcp-pick${picked ? ' on' : ''}`} title={`Pick option ${index + 1}`} onClick={onPick} disabled={picked}>
        {picked && <Check size={15} />}{picked ? 'Picked' : 'Pick'}
      </button>}
    </footer>
  </article>;
}
