import {Check, ChevronDown, Pencil, Search, SlidersHorizontal, Sparkles, Star, X} from 'lucide-react';
import {useEffect, useMemo, useRef, useState} from 'react';
import {galleryVariants, searchText, templates, variants, vocab, type Format, type Tone, type Variant} from '../catalog/catalog';
import {SCENE_TYPES} from '../videos/vocab';
import {applyKit, kitApplies, useBrandKit} from './brandKit';
import {compositions} from '../videos/registry';
import {supportsLogo} from '../videos/logo';
import {BrandStrip} from './BrandStrip';
import {Header} from './Header';
import {Media} from './Media';
import {StarButton, useAccount} from './Account';

type Sort = 'featured' | 'new';
type Energy = 'Calm' | 'Medium' | 'High';
type Filters = {
  template: string | null;
  purpose: string | null;
  formats: Format[];
  styles: string[];
  tones: Tone[];
  energy: Energy | null;
  scenes: string[];
};

export const energyOf = (n: number): Energy => (n <= 2 ? 'Calm' : n === 3 ? 'Medium' : 'High');
const FORMATS: Format[] = ['16:9', '9:16', '1:1', '4:5'];
const SCENE_FILTERS = Object.entries(SCENE_TYPES).filter(([k]) => k !== 'transition');
// Purpose pills keep a fixed order (largest purposes first) so they do not jump while the user filters.
const PURPOSE_PILLS = 4;
const PURPOSES_BY_SIZE = [...vocab.purpose].sort(
  (a, b) => galleryVariants.filter((v) => v.purpose === b).length - galleryVariants.filter((v) => v.purpose === a).length,
);
// "Featured" ranks launch, developer, and top creator/promo videos first without hiding the rest of the catalog.
const FEATURED_PRIORITY = new Set(['Product launch', 'Developer', 'Creator video', 'Holiday sale']);
const newestFirst = (a: Variant, b: Variant) => Date.parse(b.createdAt) - Date.parse(a.createdAt);
const featuredOrder = (a: Variant, b: Variant) => {
  const ap = FEATURED_PRIORITY.has(a.purpose) ? 0 : 1;
  const bp = FEATURED_PRIORITY.has(b.purpose) ? 0 : 1;
  if (ap !== bp) return ap - bp;
  return newestFirst(a, b);
};

// The gallery remounts on every visit, so its view state lives in this tab's session storage:
// opening a video and coming back keeps the sort, search, and filters.
const VIEW_KEY = 'cliphouse:gallery-view';
type View = {sort: Sort; q: string; f: Omit<Filters, 'template'>};
function readView(): Partial<View> {
  try { return JSON.parse(sessionStorage.getItem(VIEW_KEY) ?? '{}') as Partial<View>; } catch { return {}; }
}

function matches(v: Variant, f: Filters, skip?: keyof Filters) {
  if (skip !== 'template' && f.template && v.template !== f.template) return false;
  if (skip !== 'purpose' && f.purpose && v.purpose !== f.purpose) return false;
  if (skip !== 'formats' && f.formats.length && !f.formats.includes(v.format)) return false;
  if (skip !== 'styles' && f.styles.length && !f.styles.every((s) => v.style.includes(s))) return false;
  if (skip !== 'tones' && f.tones.length && !f.tones.includes(v.tone)) return false;
  if (skip !== 'energy' && f.energy && energyOf(v.energy) !== f.energy) return false;
  if (skip !== 'scenes' && f.scenes.length && !f.scenes.every((s) => v.tmpl.meta.scenes.some((x) => x.type === s))) return false;
  return true;
}

export function Gallery({initialTemplate}: {initialTemplate: string | null}) {
  const account = useAccount();
  const [savedOnly, setSavedOnly] = useState(false);
  const kit = useBrandKit();
  const applied = kitApplies(kit);
  const picks = applied && kit.picks?.length ? kit.picks : null;
  const [showAll, setShowAll] = useState(false);
  // A new set of picks (a new brand) opens on the picked set again.
  const picksKey = picks?.join(',') ?? '';
  useEffect(() => setShowAll(false), [picksKey]);
  const pickRank = useMemo(() => new Map((picks ?? []).map((id, i) => [id, i])), [picksKey]);
  const picked = !!picks && !showAll && !savedOnly;
  const saved = useMemo(readView, []);
  const [q, setQ] = useState(saved.q ?? '');
  const [sort, setSort] = useState<Sort>(saved.sort === 'new' ? 'new' : 'featured');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const [f, setF] = useState<Filters>({purpose: null, formats: [], styles: [], tones: [], energy: null, scenes: [], ...saved.f, template: initialTemplate});
  useEffect(() => {
    const {template: _template, ...rest} = f;
    void _template;
    try { sessionStorage.setItem(VIEW_KEY, JSON.stringify({sort, q, f: rest} satisfies View)); } catch { /* Storage is unavailable. */ }
  }, [sort, q, f]);
  useEffect(() => {
    if (!moreOpen) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !moreRef.current?.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [moreOpen]);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((s) => ({...s, [k]: v}));
  const toggle = <K extends 'formats' | 'styles' | 'tones' | 'scenes'>(k: K, v: Filters[K][number]) =>
    setF((s) => {
      const list = s[k] as string[];
      return {...s, [k]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v]};
    });

  const searched = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    return (savedOnly ? variants : galleryVariants).filter((v) => (!savedOnly || account.saved.has(v.id))
      && (!picked || pickRank.has(v.id))
      && terms.every((t) => searchText(v).includes(t)));
  }, [q, savedOnly, account.saved, picked, pickRank]);

  const inView = (v: Variant, skip?: keyof Filters) => matches(v, f, skip);
  const count = (skip: keyof Filters, pred: (v: Variant) => boolean) => searched.filter((v) => inView(v, skip) && pred(v)).length;

  const results = useMemo(
    () => searched.filter((v) => matches(v, f)).sort(
      picked && sort === 'featured' ? (a, b) => pickRank.get(a.id)! - pickRank.get(b.id)! : sort === 'featured' ? featuredOrder : newestFirst,
    ),
    [searched, f, sort, picked, pickRank],
  );

  const active = Boolean(q || f.template || f.purpose || f.formats.length || f.styles.length || f.tones.length || f.energy || f.scenes.length);
  // The badge counts only the filters hidden in the panel; purpose and format stay visible in the toolbar.
  const panelCount = (f.energy ? 1 : 0) + f.styles.length + f.tones.length + f.scenes.length;
  const clear = () => {
    setQ('');
    setF({template: null, purpose: null, formats: [], styles: [], tones: [], energy: null, scenes: []});
    if (location.hash.includes('?')) location.hash = '#/';
  };
  const activeTemplate = f.template ? templates.find((t) => t.id === f.template) : undefined;
  const clearTemplate = () => {
    set('template', null);
    if (location.hash.includes('template=')) location.hash = '#/';
  };

  const chip = (on: boolean, label: string, n: number, onClick: () => void) => (
    <button key={label} className={`chip ${on ? 'on' : ''}`} disabled={!on && n === 0} onClick={onClick}>
      {label}
      <span className="chip-count">{n}</span>
    </button>
  );

  const pillPurposes = PURPOSES_BY_SIZE.slice(0, PURPOSE_PILLS);
  const menuPurposes = PURPOSES_BY_SIZE.slice(PURPOSE_PILLS);
  const menuPick = f.purpose && menuPurposes.includes(f.purpose) ? f.purpose : null;
  const pickPurpose = (p: string | null) => {
    set('purpose', p && f.purpose === p ? null : p);
    setMoreOpen(false);
  };

  const searchField = (id: string) => (
    <label className="search gallery-search" htmlFor={id}>
      <Search size={15} aria-hidden="true" />
      <input id={id} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates" />
      {q && (
        <button type="button" className="icon-btn ghost" onClick={() => setQ('')} title="Clear search" aria-label="Clear search">
          <X size={14} />
        </button>
      )}
    </label>
  );

  return (
    <div className="page">
      <Header />

      <BrandStrip templateCount={galleryVariants.length} />

      <div className="gallery-layout">
        <div className="gallery-toolbar">
          {searchField('gallery-search')}
          <div className="purpose-pills" role="group" aria-label="Purpose">
            <button type="button" className={`pill ${!f.purpose ? 'on' : ''}`} aria-pressed={!f.purpose} onClick={() => pickPurpose(null)}>All</button>
            {pillPurposes.map((p) => {
              const n = count('purpose', (v) => v.purpose === p);
              return (
                <button key={p} type="button" className={`pill ${f.purpose === p ? 'on' : ''}`} aria-pressed={f.purpose === p}
                  disabled={!n && f.purpose !== p} onClick={() => pickPurpose(p)}>{p}</button>
              );
            })}
            {menuPurposes.length > 0 && (
              <div className="more-menu" ref={moreRef}>
                <button type="button" className={`pill ${menuPick ? 'on' : ''}`} aria-haspopup="menu" aria-expanded={moreOpen} onClick={() => setMoreOpen((o) => !o)}>
                  {menuPick ?? 'More'}
                  <ChevronDown size={14} aria-hidden="true" />
                </button>
                {moreOpen && (
                  <div className="more-menu-list" role="menu">
                    {menuPurposes.map((p) => {
                      const n = count('purpose', (v) => v.purpose === p);
                      return (
                        <button key={p} type="button" role="menuitemradio" aria-checked={f.purpose === p} className="menu-item"
                          disabled={!n && f.purpose !== p} onClick={() => pickPurpose(p)}>
                          <span className="menu-check">{f.purpose === p && <Check size={14} />}</span>
                          {p}
                          <span className="menu-note">{n}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="segmented sort-tabs" role="group" aria-label="Sort videos">
            {(['featured', 'new'] as Sort[]).map((s) => (
              <button key={s} className={sort === s ? 'on' : ''} aria-pressed={sort === s} onClick={() => setSort(s)}>
                {s === 'featured' ? 'Featured' : 'Newest'}
              </button>
            ))}
          </div>
        </div>

        <div className="results-bar">
          {picks && !savedOnly && (
            <div className="segmented picks-tabs" role="group" aria-label="Templates shown">
              <button className={!showAll ? 'on' : ''} aria-pressed={!showAll} onClick={() => setShowAll(false)}>
                <Sparkles size={14} aria-hidden="true" />Picked for {kit.texts?.brand || 'you'}
                <span className="tab-count">{picks.length}</span>
              </button>
              <button className={showAll ? 'on' : ''} aria-pressed={showAll} onClick={() => setShowAll(true)}>
                All <span className="tab-count">{galleryVariants.length}</span>
              </button>
            </div>
          )}
          <div className="segmented collection-tabs" role="group" aria-label="Collection">
            <button className={!savedOnly ? 'on' : ''} aria-pressed={!savedOnly} onClick={() => setSavedOnly(false)}>All videos</button>
            <button className={savedOnly ? 'on' : ''} aria-pressed={savedOnly} onClick={() => setSavedOnly(true)}><Star size={14} /> Starred {account.user && <span>{account.saved.size}</span>}</button>
          </div>
          <div className="chips format-chips" role="group" aria-label="Format">
            {FORMATS.map((x) => chip(f.formats.includes(x), x, count('formats', (v) => v.format === x), () => toggle('formats', x)))}
          </div>
          <button className={`filters-toggle ${filtersOpen || panelCount ? 'on' : ''}`} aria-expanded={filtersOpen} aria-controls="gallery-filters" onClick={() => setFiltersOpen((o) => !o)}>
            <SlidersHorizontal size={15} aria-hidden="true" />
            Filters
            {panelCount > 0 && <span className="badge-count">{panelCount}</span>}
          </button>
          <div className="results-count">
            {results.length} {results.length === 1 ? 'video' : 'videos'}
            {activeTemplate && (
              <button className="chip on template-chip" onClick={clearTemplate} title="Remove template filter">
                Template: {activeTemplate.title}
                <X size={13} aria-hidden="true" />
              </button>
            )}
            {active && (
              <button className="link-btn" onClick={clear}>
                Clear filters
              </button>
            )}
          </div>
        </div>

        <div id="gallery-filters" className={`filters ${filtersOpen ? 'open' : ''}`} hidden={!filtersOpen}>
          <section>
            <h3>Style</h3>
            <div className="chips">{vocab.style.map((s) => chip(f.styles.includes(s), s, count('styles', (v) => v.style.includes(s)), () => toggle('styles', s)))}</div>
          </section>
          <section>
            <h3>Energy</h3>
            <div className="chips">
              {(['Calm', 'Medium', 'High'] as Energy[]).map((e) =>
                chip(f.energy === e, e, count('energy', (v) => energyOf(v.energy) === e), () => set('energy', f.energy === e ? null : e)),
              )}
            </div>
          </section>
          <section>
            <h3>Tone</h3>
            <div className="chips">{(['Dark', 'Light'] as Tone[]).map((t) => chip(f.tones.includes(t), t, count('tones', (v) => v.tone === t), () => toggle('tones', t)))}</div>
          </section>
          <section>
            <h3>Includes scene</h3>
            <div className="chips">
              {SCENE_FILTERS.map(([k, label]) =>
                chip(f.scenes.includes(k), label, count('scenes', (v) => v.tmpl.meta.scenes.some((s) => s.type === k)), () => toggle('scenes', k)),
              )}
            </div>
          </section>
        </div>

        <main>
          {savedOnly && !account.user ? (
            <div className="empty"><Star size={24} /><span>Your starred videos live here.</span><button className="account-action" onClick={account.openAccount}>Sign in</button></div>
          ) : savedOnly && !account.savedReady ? (
            <div className="empty" role="status">{account.savedError || 'Connecting to your starred videos...'}
              {account.savedError && <button className="link-btn" onClick={account.retry}>Try again</button>}
            </div>
          ) : results.length === 0 ? (
            <div className="empty">
              {savedOnly && !active ? 'No starred videos yet.' : 'No videos match.'}
              <button className="link-btn" onClick={savedOnly && !active ? () => setSavedOnly(false) : clear}>
                {savedOnly && !active ? 'Browse videos' : 'Clear filters'}
              </button>
            </div>
          ) : (
            <div className="grid">
              {results.map((v) => {
                // A logo-only kit changes only templates with a logo slot; the others keep their stock previews.
                const logoSlot = supportsLogo(compositions[v.template]?.schema);
                const kitted = applied ? applyKit(v.props, kit, logoSlot) : null;
                const props = kitted && kitted !== v.props ? kitted : null;
                const theme = (props ?? v.props).theme;
                return (
                  <article key={v.id} className="card">
                    <div className="card-media">
                      <a href={`#/v/${v.id}`} className="card-link" aria-label={`Open ${v.title}`}>
                        <Media variant={v} props={props} />
                      </a>
                      <a className="card-edit" href={`#/v/${v.id}`} aria-label={`Edit ${v.title}`}><Pencil size={14} />Edit</a>
                      <span className="badge">
                        {v.format} · {v.seconds}s
                      </span>
                    </div>
                    <a href={`#/v/${v.id}`} className="card-link" aria-label={`Open ${v.title} details`}>
                    <div className="card-body">
                      <div className="card-title">
                        <span>{v.title}</span>
                        <div className="palette">
                          {Object.values(theme).map((c: string, i) => (
                            <span key={i} style={{background: c}} />
                          ))}
                        </div>
                      </div>
                    </div>
                    </a>
                    <StarButton id={v.id} title={v.title} />
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
