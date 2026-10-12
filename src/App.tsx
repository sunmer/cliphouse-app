import {useEffect, useState} from 'react';
import {variants} from './catalog/catalog';
import {Editor} from './ui/Editor';
import {Gallery} from './ui/Gallery';
import {SiteFooter, PrivacyPage} from './ui/Privacy';
import {trackPage, trackReturnVisit} from './services/analytics';
import {SharedVideo} from './ui/SharedVideo';
import {SavedVideo} from './ui/SavedVideo';
import {BenchmarkBanner} from './ui/BenchmarkBanner';

type Route = {view: 'editor'; id: string; handoff?: string; version?: number} | {view: 'shared'; id: string; openShare?: boolean} | {view: 'saved'; id: string} | {view: 'gallery'; params: URLSearchParams} | {view: 'privacy'};

function readRoute(): Route {
  const shared = location.pathname.match(/^\/s\/([A-Za-z0-9_-]{24,64})\/?$/);
  if (shared && !location.hash) return {view: 'shared', id: shared[1]};
  const [rawPath, rawQuery = ''] = location.hash.replace(/^#\/?/, '').split(/\?(.*)/s);
  const editor = rawPath.match(/^v\/([a-z0-9-]+)$/);
  if (editor) {
    // Decode the query separately; agent props may contain characters that are special in a hash.
    const query = new URLSearchParams(rawQuery);
    const version = Number(query.get('v'));
    return {view: 'editor', id: editor[1], handoff: query.get('props') ?? undefined, version: Number.isInteger(version) && version > 0 ? version : undefined};
  }
  const hash = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const saved = hash.match(/^d\/([A-Za-z0-9_-]{24,64})$/);
  if (saved) return {view: 'saved', id: saved[1]};
  const published = hash.match(/^s\/([A-Za-z0-9_-]{24,64})(\?share=1)?$/);
  if (published) return {view: 'shared', id: published[1], openShare: !!published[2]};
  if (hash === 'privacy') return {view: 'privacy'};
  return {view: 'gallery', params: new URLSearchParams(hash.split('?')[1] ?? '')};
}

export function App() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const variant = route.view === 'editor' ? variants.find((v) => v.id === route.id) : undefined;
  useEffect(() => {
    window.scrollTo(0, 0);
    if (route.view !== 'shared') document.title = variant ? `${variant.title} | cliphou.se` : route.view === 'privacy' ? 'Privacy | cliphou.se' : 'cliphou.se';
    trackPage(route.view === 'shared' ? 'shared-video' : route.view === 'privacy' ? 'privacy' : variant?.id);
  }, [variant?.id, route.view]);
  useEffect(() => { trackReturnVisit(); }, []);

  const template = route.view === 'gallery' ? route.params.get('template') : null;
  return <>
    <BenchmarkBanner />
    {route.view === 'saved' ? <SavedVideo key={route.id} id={route.id} /> : route.view === 'shared' ? <SharedVideo key={route.id} id={route.id} openShare={route.openShare} />
      : variant && route.view === 'editor' ? <Editor key={`${variant.id}:${route.version ?? ''}:${route.handoff ?? ''}`} variant={variant} handoff={route.handoff} templateVersion={route.version} />
      : route.view === 'privacy' ? <PrivacyPage /> : <Gallery key={template ?? 'all'} initialTemplate={template} />}
    <SiteFooter />
  </>;
}
