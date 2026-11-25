import {
  ArrowRight, ChevronDown, Gamepad2, Globe, ImagePlus, Palette as PaletteIcon,
  Pencil, Pipette, RefreshCw, RotateCcw, Tag, Type, X,
} from 'lucide-react';
import {useEffect, useRef, useState, type FormEvent} from 'react';
import {THEME_ROLES, type Theme} from '../videos/vocab';
import {track} from '../services/analytics';
import {autofillBrand, sharingConfigured} from '../services/sharing';
import {kitHasTexts, setBrandKit, useBrandKit, type BrandKit} from './brandKit';
import {PRESETS, generatePalettes} from './palettes';
import {ThemeControls, type Palette, type ThemeChange} from './ThemeControls';
import {LogoControls} from './LogoControls';

const EXAMPLES = [
  {label: 'linear.app', value: 'linear.app', Icon: Globe},
  {label: 'Indie game devlog', value: 'Indie game devlog: weekly progress on a cozy pixel-art farming game', Icon: Gamepad2},
  {label: 'Weekend flash sale', value: 'Weekend flash sale: 40% off every sneaker in the store, ends Sunday', Icon: Tag},
];

const looksLikeUrl = (s: string) => /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/i.test(s.trim());
const hostOf = (s: string) => s.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').split(/[/?#]/)[0];
const generate = (): Palette[] => generatePalettes(PRESETS[0].colors).slice(1);

function readTexts(kit: BrandKit) {
  return {
    name: kit.texts?.brand ?? '',
    headline: kit.texts?.headline ?? '',
  };
}

export function BrandStrip({templateCount = 146}: {templateCount?: number}) {
  const kit = useBrandKit();
  const personalized = kitHasTexts(kit) || (kit.enabled && !!kit.theme);

  const [query, setQuery] = useState('');
  const [lastInput, setLastInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [extracted, setExtracted] = useState<Theme | null>(kit.theme);
  const [generated, setGenerated] = useState<Palette[] | null>(null);

  const runId = useRef(0);
  const rootRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Color pickers fire on every drag step; report one custom edit per pause.
  const customTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(customTimer.current), []);

  useEffect(() => {
    if (!extracted && kit.theme) setExtracted(kit.theme);
  }, [kit.theme, extracted]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (drawer) setDrawer(false);
      else if (editing) cancelEdit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const run = async (raw: string) => {
    const input = raw.trim();
    if (!input || busy) return;
    const id = ++runId.current;
    setQuery(input);
    setBusy(true);
    setError(null);
    try {
      const result = await autofillBrand(input);
      if (id !== runId.current) return;
      const theme = result.theme ?? null;
      setExtracted(theme);
      setLastInput(input);
      // Apply copy + polarity-safe brand colors immediately so every template looks on-brand
      // without breaking dark/light contrast.
      setBrandKit({
        enabled: !!theme,
        colorMode: 'adaptive',
        theme,
        texts: result.texts ?? null,
        textsEnabled: true,
      });
      track('brandkit_autofill', {input_kind: result.sourceUrl ? 'url' : 'brief'});
      setEditing(false);
      setDrawer(false);
    } catch (err) {
      if (id !== runId.current) return;
      const msg = (err as Error).message;
      setError(msg && /limit|busy/i.test(msg)
        ? msg
        : looksLikeUrl(input)
          ? 'Could not read that site. Try a one-sentence brief instead.'
          : 'Could not build a preview. Try again.');
    } finally {
      if (id === runId.current) setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(query);
  };

  const startEdit = () => {
    setQuery(lastInput);
    setError(null);
    setDrawer(false);
    setEditing(true);
  };

  const cancelEdit = () => {
    runId.current++;
    setBusy(false);
    setError(null);
    setEditing(false);
  };

  const reset = () => {
    runId.current++;
    setBusy(false);
    setBrandKit({enabled: false, colorMode: 'exact', theme: null, logo: null, texts: null, textsEnabled: false});
    setExtracted(null);
    setGenerated(null);
    setQuery('');
    setLastInput('');
    setError(null);
    setEditing(false);
    setDrawer(false);
  };

  const toggleColors = () => {
    const fallbackTheme = kit.theme ?? extracted ?? PRESETS[0].colors;
    const enabled = !kit.enabled;
    setBrandKit({...kit, theme: fallbackTheme, enabled});
    track('brandkit_toggle', {state: enabled ? 'on' : 'off'});
  };

  const brandPaletteName = 'Brand colors';
  const applyTheme = (theme: Theme, source: 'extracted' | 'palette' | 'generated' | 'custom') => {
    setBrandKit({...kit, theme, enabled: true, colorMode: source === 'extracted' ? 'adaptive' : 'exact'});
    if (source === 'custom') {
      window.clearTimeout(customTimer.current);
      customTimer.current = window.setTimeout(() => track('brandkit_theme', {theme_source: 'custom'}), 800);
    } else {
      track('brandkit_theme', {theme_source: source});
    }
  };

  const onThemeChange = (theme: Theme, change: ThemeChange) => {
    if (change.kind === 'color') {
      applyTheme(theme, 'custom');
    } else {
      const src = change.name === brandPaletteName ? 'extracted' : generated ? 'generated' : 'palette';
      applyTheme(theme, src);
    }
  };

  if (!sharingConfigured && !personalized) return null;

  const InputIcon = looksLikeUrl(query) ? Globe : Type;

  // Before personalization (or while editing): centered brand-first band, sized so the first row of templates stays in view.
  if (!personalized || editing) {
    return (
      <section ref={rootRef} className={`brand-strip brand-hero ${editing ? 'is-editing' : ''}`} aria-label="Personalize templates">
        <div className="brand-hero-inner">
          {!editing && <>
            <h1 className="brand-hero-title">Motion videos, ready to remix</h1>
            <p className="brand-hero-sub">Pick a template below, or paste your site to preview all {templateCount} in your brand.</p>
          </>}
          <form className="brand-cmd" onSubmit={onSubmit} role="search" aria-label="Preview templates with your brand">
            {editing && <label htmlFor="brand-input" className="brand-cmd-label">Change brand</label>}
            <div className={`brand-cmd-field ${busy ? 'is-busy' : ''}`}>
              <InputIcon className="brand-cmd-icon" size={16} aria-hidden="true" />
              <input
                ref={inputRef}
                id="brand-input"
                type="text"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                maxLength={500}
                placeholder="Paste your site URL, or describe what you're launching"
                value={query}
                onChange={(e) => { setQuery(e.target.value); if (error) setError(null); }}
                aria-invalid={!!error}
                aria-describedby={error ? 'brand-error' : undefined}
              />
              {editing && (
                <button type="button" className="brand-icon-btn" onClick={cancelEdit} aria-label="Cancel">
                  <X size={16} />
                </button>
              )}
              <button type="submit" className="brand-cmd-go" disabled={!query.trim() || busy}>
                {busy && <RefreshCw size={15} className="brand-spin" aria-hidden="true" />}
                <span>{busy ? 'Personalizing...' : `Preview all ${templateCount}`}</span>
                {!busy && <ArrowRight size={15} aria-hidden="true" />}
              </button>
            </div>
          </form>

          <div className="brand-examples" role="group" aria-label="Examples">
            <span className="brand-examples-label">No site handy? Try</span>
            {EXAMPLES.map(({label, value, Icon}) => (
              <button key={label} type="button" className="brand-pill" disabled={busy} onClick={() => void run(value)}>
                <Icon size={13} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
          {error && <p id="brand-error" className="brand-error" role="alert">{error}</p>}
        </div>
      </section>
    );
  }

  // After personalization: compact active bar showing brand monogram, live copy, and interactive colors/logo controls.
  const {name, headline} = readTexts(kit);
  const displayName = name || (looksLikeUrl(lastInput) ? hostOf(lastInput) : 'your brand');
  const theme = kit.theme ?? extracted ?? PRESETS[0].colors;
  const basePalettes = generated ?? PRESETS;
  const palettes: Palette[] = extracted ? [{name: brandPaletteName, colors: extracted}, ...basePalettes] : basePalettes;
  const monogram = displayName.trim().charAt(0).toUpperCase() || 'B';

  return (
    <section ref={rootRef} className="brand-strip is-active" aria-label="Brand preview">
      <div className="brand-strip-inner">
        <div className="brand-live" aria-live="polite">
          <span className="brand-monogram" style={{background: theme.background, color: theme.accent, borderColor: theme.surface}} aria-hidden="true">
            {monogram}
          </span>
          <div className="brand-live-copy">
            <span className="brand-live-title">Previewing as <strong>{displayName}</strong></span>
            <span className="brand-live-sub">
              {headline ? `${headline} · ` : ''}{kit.enabled ? 'Using your brand colors and copy' : 'Using your copy with template colors'}
            </span>
          </div>
        </div>

        <div className="brand-colors" role="group" aria-label="Brand colors">
          <button
            type="button"
            role="switch"
            aria-checked={kit.enabled}
            className="brand-switch"
            onClick={toggleColors}
          >
            <span className="brand-switch-track" aria-hidden="true"><span className="brand-switch-thumb" /></span>
            Brand colors
          </button>
          <button
            type="button"
            className={`brand-swatch-btn ${drawer ? 'is-open' : ''}`}
            onClick={() => setDrawer((d) => !d)}
            aria-expanded={drawer}
            aria-controls="brand-drawer"
            aria-label="Edit brand colors and logo"
          >
            <span className={`brand-dots ${kit.enabled ? '' : 'is-off'}`} aria-hidden="true">
              {THEME_ROLES.map((role) => <span key={role} style={{background: theme[role]}} />)}
            </span>
            <ChevronDown size={14} className="brand-chevron" aria-hidden="true" />
          </button>
        </div>

        <div className="brand-actions">
          {sharingConfigured && (
            <button type="button" className="brand-btn" onClick={startEdit}>
              <Pencil size={14} aria-hidden="true" />Change
            </button>
          )}
          <button type="button" className="brand-btn ghost" onClick={reset}>
            <RotateCcw size={14} aria-hidden="true" />Back to defaults
          </button>
        </div>
      </div>

      {drawer && (
        <div id="brand-drawer" className="brand-drawer">
          <div className="brand-drawer-col">
            <div className="brand-drawer-head">
              <h3><PaletteIcon size={14} aria-hidden="true" />Palettes</h3>
              <div className="brand-drawer-links">
                {extracted && (
                  <button type="button" className="brand-link" onClick={() => applyTheme(extracted, 'extracted')}>
                    Use extracted
                  </button>
                )}
                <button type="button" className="brand-link" onClick={() => setGenerated(generate())}>
                  <RefreshCw size={13} aria-hidden="true" />Shuffle
                </button>
              </div>
            </div>
            <ThemeControls
              theme={theme}
              palettes={palettes}
              onChange={onThemeChange}
              selected={kit.enabled}
              showColors={false}
              idPrefix="brand"
            />
            <h3 className="brand-drawer-sub"><Pipette size={14} aria-hidden="true" />Custom colors</h3>
            <div className="brand-custom">
              <ThemeControls
                theme={theme}
                palettes={[]}
                onChange={onThemeChange}
                selected={kit.enabled}
                idPrefix="brand-custom"
              />
            </div>
          </div>

          {sharingConfigured && (
            <div className="brand-drawer-col">
              <h3><ImagePlus size={14} aria-hidden="true" />Logo</h3>
              <LogoControls
                logo={kit.logo}
                source="brandkit"
                brandName={displayName}
                onChange={(logo) => setBrandKit((k) => ({...k, logo}))}
              />
            </div>
          )}

          <button type="button" className="brand-icon-btn brand-drawer-close" onClick={() => setDrawer(false)} aria-label="Close">
            <X size={16} />
          </button>
        </div>
      )}
    </section>
  );
}
