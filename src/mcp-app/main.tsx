import {createRoot} from 'react-dom/client';
import {useEffect, useState} from 'react';
import {createBridge, type HostCapabilities, type ToolResult} from './bridge';
import {PreviewApp, type PreviewItem} from './PreviewApp';
import {setPlayerBase} from '../ui/VideoPlayer';
import {setSiteOrigin} from '../services/sharing';
import './previews.css';

// The view is served inline in a sandboxed iframe on the host's origin, so assets load from the site.
const SITE = (document.querySelector<HTMLMetaElement>('meta[name="cliphouse-origin"]')?.content || 'https://cliphou.se').replace(/\/$/, '');
setPlayerBase(SITE);
setSiteOrigin(SITE);

const itemsOf = (result: ToolResult | undefined): PreviewItem[] | null => {
  const previews = (result?.structuredContent as {previews?: PreviewItem[]} | undefined)?.previews;
  return Array.isArray(previews) ? previews : null;
};

function Root() {
  const [bridge] = useState(() => createBridge());
  const [caps, setCaps] = useState<HostCapabilities>({});
  const [items, setItems] = useState<PreviewItem[] | null>(null);
  const [status, setStatus] = useState<'waiting' | 'error' | 'cancelled'>('waiting');
  useEffect(() => {
    const offResult = bridge.on('ui/notifications/tool-result', (params) => {
      const next = itemsOf(params as ToolResult);
      if (next) setItems(next); else setStatus('error');
    });
    const offCancel = bridge.on('ui/notifications/tool-cancelled', () => setStatus('cancelled'));
    bridge.connect().then((r) => {
      setCaps(r.hostCapabilities ?? {});
      document.documentElement.dataset.theme = r.hostContext?.theme ?? 'dark';
    }).catch(() => {});
    // Hosts size the iframe from the view's reported height. The root element is measured, because the
    // document is at least as tall as the iframe and would never let it shrink.
    const root = document.getElementById('root')!;
    const observer = new ResizeObserver(() => {
      const box = root.getBoundingClientRect();
      bridge.size(Math.ceil(box.width), Math.ceil(box.height));
    });
    observer.observe(root);
    return () => { offResult(); offCancel(); observer.disconnect(); };
  }, [bridge]);
  if (items) return <PreviewApp items={items} bridge={bridge} caps={caps} />;
  return <p className="mcp-status">{status === 'waiting' ? 'Rendering previews' : status === 'cancelled' ? 'Previews cancelled' : 'Previews are not available. Use the editor links.'}</p>;
}

createRoot(document.getElementById('root')!).render(<Root />);
