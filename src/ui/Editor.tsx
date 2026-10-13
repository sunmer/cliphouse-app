import {ArrowLeft, Bot, Check, Copy, Download, Eye, EyeOff, FileCode, LoaderCircle, Maximize, Minimize, Pause, Play, Redo2, RefreshCw, RotateCcw, Save, Undo2, Volume2, VolumeX, Wand2} from 'lucide-react';
import {useCallback, useEffect, useMemo, useRef, useState, type CSSProperties} from 'react';
import type {Variant} from '../catalog/catalog';
import {generationLabel} from '../catalog/generation';
import {ROLES, THEME_LABELS, THEME_ROLES, type Role, type VideoProps} from '../videos/contract';
import {ENGINE_LABELS} from '../videos/engine';
import {mediaOf, mediaSlots, slotOptions} from '../videos/media/catalog';
import {hideableRoles, isMusicSchema, scoreOf} from '../videos/music/schema';
import {SOUND_ENABLED} from '../site/flags';
import {compositionFor} from '../videos/registry';
import {currentVersion, handoffPath, sourcePath, specPath} from '../agent/versions';
import {readHandoff} from '../agent/handoff';
import {applyKit, kitHasValues, useBrandKit} from './brandKit';
import {derivePalettes, generatePalettes} from './palettes';
import {TextCanvas} from './TextCanvas';
import {ImagePicker} from './ImagePicker';
import {Timeline} from './Timeline';
import {VideoPlayer, type VideoPlayerRef} from './VideoPlayer';
import {StarButton, useAccount} from './Account';
import {ShareButton} from './Share';
import {saveDraft} from '../services/drafts';
import {exportVideo, sharingConfigured, type SharedVideo} from '../services/sharing';
import {track} from '../services/analytics';
import {useScoreAudio} from './useScoreAudio';
import {templateKind} from '../catalog/catalog';

const storageKey = (id: string) => `voodoo:v2:${id}`;
type LockableOrientation = ScreenOrientation & {lock?: (orientation: 'landscape') => Promise<void>};
const unlockOrientation = () => {
  try { screen.orientation?.unlock?.(); } catch { /* Some browsers expose unsupported orientation methods. */ }
};

function useHistory(initial: VideoProps) {
  const [state, setState] = useState({past: [] as VideoProps[], now: initial, future: [] as VideoProps[]});
  const set = useCallback((next: VideoProps) => {
    setState((s) => JSON.stringify(s.now) === JSON.stringify(next) ? s :
      {past: [...s.past.slice(-49), s.now], now: next, future: []});
  }, []);
  const undo = () => setState((s) => s.past.length ? {past: s.past.slice(0, -1), now: s.past[s.past.length - 1], future: [s.now, ...s.future]} : s);
  const redo = () => setState((s) => s.future.length ? {past: [...s.past, s.now], now: s.future[0], future: s.future.slice(1)} : s);
  return {props: state.now, set, undo, redo, canUndo: state.past.length > 0, canRedo: state.future.length > 0};
}

export function Editor({variant, sharedProps, shareId, draftId, published, openShare, handoff, templateVersion}: {
  variant: Variant; sharedProps?: VideoProps; shareId?: string; draftId?: string; published?: SharedVideo; openShare?: boolean;
  handoff?: string; templateVersion?: number;
}) {
  const latest = currentVersion(variant.template);
  const [version, versionError] = useMemo(() => {
    try { compositionFor(variant.template, templateVersion ?? latest); return [templateVersion ?? latest, '']; }
    catch (e) { return [latest, (e as Error).message]; }
  }, [variant.template, templateVersion, latest]);
  // Edits of an older template version stay pinned to it; local drafts of older versions get a separate key.
  const localKey = version === latest ? variant.id : `${variant.id}@v${version}`;
  const account = useAccount();
  const draft = useRef<{uid: string; id: string} | null>(draftId && account.user ? {uid: account.user.uid, id: draftId} : null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportedKey, setExportedKey] = useState('');
  const [savedKey, setSavedKey] = useState(draftId ? JSON.stringify(sharedProps) : '');
  const c = compositionFor(variant.template, version);
  const kit = useBrandKit();
  const incoming = useMemo(() => handoff === undefined ? null : readHandoff(handoff, c.schema), [handoff, c]);
  const initial = useMemo(() => {
    if (sharedProps) return sharedProps;
    if (incoming?.ok) return incoming.props;
    try {
      const result = c.schema.safeParse(JSON.parse(localStorage.getItem(storageKey(localKey)) ?? 'null'));
      return result.success ? result.data as VideoProps : variant.props;
    } catch { return variant.props; }
  }, [c, variant, sharedProps, incoming, localKey]);
  const h = useHistory(initial);
  const {props} = h;
  const player = useRef<VideoPlayerRef>(null);
  const immersive = useRef<HTMLDivElement>(null);
  const textCanvas = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [editing, setEditing] = useState<Role | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [briefCopied, setBriefCopied] = useState(false);
  const [notice, setNotice] = useState(() => versionError || (incoming && !incoming.ok ? `Agent link rejected. ${incoming.error} The video was not changed.` : ''));
  const [hexes, setHexes] = useState(props.theme);
  const defaultPalettes = useMemo(() => derivePalettes(variant.props.theme), [variant.props.theme]);
  const [generatedPalettes, setGeneratedPalettes] = useState<typeof defaultPalettes | null>(null);
  const palettes = generatedPalettes ?? defaultPalettes;
  const slots = mediaSlots(c.schema);
  const media = mediaOf(props);
  const kitProps = kitHasValues(kit) ? applyKit(props, kit) : null;
  const kitDiffers = kitProps && JSON.stringify(kitProps) !== JSON.stringify(props);
  // Sound is switched off site-wide until there is a music strategy: no sound button, no sound in MP4 exports.
  // Music templates keep their optional-text toggles.
  const music = isMusicSchema(c.schema);
  const sound = SOUND_ENABLED && music;
  const score = scoreOf(c);
  const optional = hideableRoles(c.schema);
  const hidden = (props as {hidden?: Role[]}).hidden ?? [];
  const exportSound = sound && !!(props as {audio?: {enabled: boolean}}).audio?.enabled;
  const [listening, setListening] = useState(false);
  const audio = useScoreAudio({score: sound ? score : undefined, fps: c.fps, props, player, enabled: sound && listening});
  const soundPlayed = useRef(false);
  const toggleSound = () => {
    const next = !listening;
    if (next) audio.unlock();
    setListening(next);
    track('sound_toggle', {variant_id: variant.id, state: next ? 'on' : 'off'});
  };
  useEffect(() => {
    if (!music || !listening || !playing || soundPlayed.current) return;
    soundPlayed.current = true;
    track('sound_play', {variant_id: variant.id});
  }, [music, listening, playing, variant.id]);
  const toggleRole = (role: Role) => {
    const on = hidden.includes(role);
    const order = optional.filter((r) => r === role ? !on : hidden.includes(r));
    h.set({...props, hidden: order} as VideoProps);
    track('role_toggle', {variant_id: variant.id, text_role: role, state: on ? 'shown' : 'hidden'});
  };
  const setExportSound = (enabled: boolean) => {
    h.set({...props, audio: {enabled}} as VideoProps);
  };

  useEffect(() => { track('editor_open', {variant_id: variant.id, template_kind: templateKind(variant.tmpl)}); }, [variant.id, variant.tmpl]);
  useEffect(() => {
    if (!incoming) return;
    track(incoming.ok ? 'agent_handoff_open' : 'agent_handoff_reject', {variant_id: variant.id});
    // Remove the props from the address bar after loading so reloads use the saved local edit.
    if (incoming.ok) history.replaceState(null, '', `${location.pathname}${location.search}#/v/${variant.id}${version === latest ? '' : `?v=${version}`}`);
  }, [incoming, variant.id, version, latest]);
  useEffect(() => {
    setHexes(props.theme);
    // Account drafts remain private; do not copy them into anonymous browser storage.
    if (draftId) return;
    try { localStorage.setItem(storageKey(shareId ? `share:${shareId}` : localKey), JSON.stringify(props)); }
    catch { setNotice('Changes could not be saved on this device. Save this edit to keep a copy.'); }
  }, [props, localKey, shareId, draftId]);
  const save = async () => {
    const user = await account.requireSignIn();
    if (draft.current?.uid !== user.uid) draft.current = {uid: user.uid, id: crypto.randomUUID().replaceAll('-', '')};
    const id = await saveDraft(user.uid, draft.current.id, variant, props, version);
    setSavedKey(JSON.stringify(props));
    track('save_video', {variant_id: variant.id});
    return id;
  };
  const saveAndOpen = async () => {
    if (saving) return;
    setSaving(true); setNotice('');
    player.current?.pause();
    try {
      const id = await save();
      location.hash = `/d/${id}`;
    } catch (e) { setNotice((e as Error).message); }
    finally { setSaving(false); }
  };
  useEffect(() => {
    setGeneratedPalettes(null);
  }, [variant.props.theme]);
  useEffect(() => {
    const p = player.current;
    const on = () => setPlaying(true);
    const off = () => setPlaying(false);
    const hidden = () => { if (document.hidden) p?.pause(); };
    p?.addEventListener('play', on);
    p?.addEventListener('pause', off);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      p?.removeEventListener('play', on);
      p?.removeEventListener('pause', off);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [c]);
  const focusEditor = useCallback(() => {
    if (saving || editing || document.querySelector('dialog[open]')) return;
    textCanvas.current?.focus({preventScroll: true});
  }, [editing, saving]);
  useEffect(() => {
    focusEditor();
    const settle = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable="true"], dialog')) return;
      requestAnimationFrame(() => {
        const active = document.activeElement as HTMLElement | null;
        if (!active || active === document.body || active.tagName === 'BUTTON' || active.classList.contains('text-hit')) focusEditor();
      });
    };
    const blurred = () => requestAnimationFrame(() => { if (document.activeElement === document.body) focusEditor(); });
    document.addEventListener('pointerup', settle);
    document.addEventListener('focusout', blurred);
    return () => {
      document.removeEventListener('pointerup', settle);
      document.removeEventListener('focusout', blurred);
    };
  }, [focusEditor]);
  useEffect(() => {
    if (!expanded) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const fullscreen = () => { if (!document.fullscreenElement) setExpanded(false); };
    const resize = () => {
      if (window.innerWidth > 1024) {
        setExpanded(false);
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
      }
    };
    document.addEventListener('fullscreenchange', fullscreen);
    window.addEventListener('resize', resize);
    return () => {
      document.body.style.overflow = overflow;
      unlockOrientation();
      document.removeEventListener('fullscreenchange', fullscreen);
      window.removeEventListener('resize', resize);
    };
  }, [expanded]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (saving) return;
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return;
      if (e.key === 'Escape' && expanded) {
        setExpanded(false);
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
      }
      if (editing) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) h.redo(); else h.undo();
      }
      if (e.code === 'Space' && target.tagName !== 'BUTTON') { e.preventDefault(); player.current?.toggle(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const toggleExpanded = async () => {
    if (expanded) {
      setExpanded(false);
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    } else {
      setExpanded(true);
      // Keep CSS screen-filling mode when native element fullscreen is unavailable.
      if (document.fullscreenEnabled && immersive.current?.requestFullscreen) {
        await immersive.current.requestFullscreen().catch(() => {});
      }
      if (c.width > c.height) {
        try { await (screen.orientation as LockableOrientation | undefined)?.lock?.('landscape'); } catch { /* Physical rotation remains available. */ }
      }
    }
  };
  const copyAgentLink = async () => {
    const site = `${location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}`;
    const spec = published ? published.agent : `${site}${specPath(variant.id)}`;
    const text = `Edit this cliphou.se video.
Agent spec (no JavaScript needed): ${spec}
Current edit: ${site}${handoffPath(variant.id, props, version === latest ? undefined : version)}
For text and color edits, return a link in the spec's handoff format. For code edits, download the spec's source package and render it locally.`;
    try {
      await navigator.clipboard.writeText(text);
      track('agent_link_copy', {variant_id: variant.id});
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { setNotice(`Clipboard is unavailable. Give your agent ${spec}`); }
  };
  const copyBrief = async () => {
    try {
      await navigator.clipboard.writeText(variant.tmpl.prompt);
      track('template_brief_copy', {variant_id: variant.id});
      setBriefCopied(true);
      setTimeout(() => setBriefCopied(false), 1600);
    } catch { setNotice('Clipboard is unavailable. Select the creative brief text instead.'); }
  };
  const downloadMp4 = async () => {
    if (exporting) return;
    setExporting(true); setNotice('');
    player.current?.pause();
    try {
      await account.requireSignIn();
      setNotice('Rendering your MP4. This usually takes under a minute.');
      const result = await exportVideo(variant.id, props, version);
      const link = document.createElement('a');
      link.href = result.url;
      link.download = result.filename;
      document.body.append(link);
      link.click();
      link.remove();
      setExportedKey(JSON.stringify(props));
      setNotice('Your MP4 is downloading.');
      track('mp4_export', {variant_id: variant.id, template_kind: templateKind(variant.tmpl)});
      if (exportSound) track('audio_export', {variant_id: variant.id});
    } catch (e) { setNotice((e as Error).message); }
    finally { setExporting(false); }
  };
  const changeHex = (key: typeof THEME_ROLES[number], value: string) => {
    setHexes((old) => ({...old, [key]: value}));
    if (/^#[0-9a-f]{6}$/i.test(value) && value.toLowerCase() !== props.theme[key].toLowerCase()) {
      h.set({...props, theme: {...props.theme, [key]: value}});
      track('color_edit', {variant_id: variant.id, color_role: key});
    }
  };

  return (
    <main className="editor-page" inert={saving} aria-busy={saving}>
      <div ref={immersive} className={`immersive-editor ${c.width > c.height ? 'landscape-video' : ''} ${expanded ? 'expanded' : ''}`} style={{'--video-ratio': c.width / c.height} as CSSProperties}>
        <header className="editor-top">
          <a className="overlay-btn" href={`${import.meta.env.BASE_URL}#/`} title="All videos" aria-label="All videos"><ArrowLeft size={20} /></a>
          <h1>{variant.title}</h1>
          <div className="editor-history">
            <button className="overlay-btn" title="Undo" aria-label="Undo" disabled={!h.canUndo || !!editing} onClick={h.undo}><Undo2 size={18} /></button>
            <button className="overlay-btn" title="Redo" aria-label="Redo" disabled={!h.canRedo || !!editing} onClick={h.redo}><Redo2 size={18} /></button>
          </div>
        </header>
        <div className="editor-video-area">
          <div className="editor-video">
            <TextCanvas ref={textCanvas} player={player} props={props} playing={playing} onEditing={setEditing}
              onCommit={(role, value) => { h.set({...props, texts: {...props.texts, [role]: value}}); track('text_edit', {variant_id: variant.id, text_role: role}); }}>
              <VideoPlayer ref={player} composition={c} props={props} autoPlay={playing} style={{width: '100%', height: '100%'}} />
            </TextCanvas>
          </div>
        </div>
        <nav className="editor-tools" aria-label="Video tools">
          <StarButton id={variant.id} title={variant.title} overlay />
          <button className="overlay-btn mobile-expand" title={expanded ? 'Exit fullscreen' : 'Fullscreen'} aria-label={expanded ? 'Exit fullscreen' : 'Fullscreen'}
            disabled={!!editing} onClick={toggleExpanded}>{expanded ? <Minimize size={20} /> : <Maximize size={20} />}</button>
          {kitDiffers && <button className="overlay-btn kit-apply" title="Apply brand kit" aria-label="Apply brand kit"
            disabled={!!editing} onClick={() => h.set(kitProps!)}><Wand2 size={20} /></button>}
          <button className="overlay-btn" title="Reset to original" aria-label="Reset to original"
            disabled={!!editing || JSON.stringify(props) === JSON.stringify(variant.props)} onClick={() => h.set(variant.props)}><RotateCcw size={20} /></button>
          <button className="overlay-btn" title="Save video" aria-label="Save video" disabled={!!editing || saving}
            onClick={() => void saveAndOpen()}>{saving ? <LoaderCircle className="spin" size={20} /> : savedKey === JSON.stringify(props) ? <Check size={20} /> : <Save size={20} />}</button>
          <ShareButton variant={variant} props={props} templateVersion={version} disabled={!!editing || saving} save={save} publishedVideo={published} initiallyOpen={openShare}
            beforeOpen={() => { player.current?.pause(); if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); }} />
          <button className={`overlay-btn ${copied ? 'confirmed' : ''}`} title="Copy agent link" aria-label="Copy agent link" disabled={!!editing} onClick={copyAgentLink}>
            {copied ? <Check size={20} /> : <Bot size={20} />}
          </button>
          <a className="overlay-btn" title={`Download source (template v${version})`} aria-label="Download source" download
            href={`${import.meta.env.BASE_URL.replace(/\/$/, '')}${sourcePath(variant.template, version)}`}
            onClick={() => track('source_download', {variant_id: variant.id})}><FileCode size={20} /></a>
          {sharingConfigured && <button className={`overlay-btn ${exportedKey === JSON.stringify(props) ? 'confirmed' : ''}`} title="Download MP4" aria-label="Download MP4"
            disabled={!!editing || saving || exporting} aria-busy={exporting} onClick={() => void downloadMp4()}>
            {exporting ? <LoaderCircle className="spin" size={20} /> : exportedKey === JSON.stringify(props) ? <Check size={20} /> : <Download size={20} />}
          </button>}
        </nav>
        <div className="editor-bottom">
          <button className="overlay-btn playback-btn" title={playing ? 'Pause' : 'Play'} aria-label={playing ? 'Pause' : 'Play'}
            disabled={!!editing} onClick={() => player.current?.toggle()}>{playing ? <Pause size={20} /> : <Play size={20} />}</button>
          {sound && <button className={`overlay-btn sound-btn ${listening ? 'on' : ''}`} title={listening ? 'Mute sound' : 'Play sound'} aria-label={listening ? 'Mute sound' : 'Play sound'}
            aria-pressed={listening} data-audio-ready={audio.ready ? 'true' : 'false'} onClick={toggleSound}>{listening ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>}
          <Timeline meta={c} player={player} focusRole={editing} disabled={!!editing} />
        </div>
      </div>
      {music && optional.length > 0 && <section className="editor-theme editor-music" aria-labelledby="music-heading">
        <div className="theme-heading"><h2 id="music-heading">{sound ? 'Text and sound' : 'Optional text'}</h2>
          {sound && score && <span className="music-facts">{score.bpm} BPM · {score.scenes.reduce((n, s) => n + s.bars, 0)} bars</span>}</div>
        <div className="music-controls">
          <div className="role-toggles" role="group" aria-label="Optional text">
            {optional.map((role) => {
              const shown = !hidden.includes(role);
              return <button key={role} className={`role-toggle ${shown ? 'on' : ''}`} aria-pressed={shown} disabled={!!editing}
                title={`${shown ? 'Hide' : 'Show'} ${ROLES[role].label.toLowerCase()}`} aria-label={`${shown ? 'Hide' : 'Show'} ${ROLES[role].label}`}
                onClick={() => toggleRole(role)}>{shown ? <Eye size={16} /> : <EyeOff size={16} />}<span>{ROLES[role].label}</span></button>;
            })}
          </div>
          {sound && <label className="export-sound">
            <input type="checkbox" checked={exportSound} disabled={!!editing} onChange={(e) => setExportSound(e.target.checked)} />
            <span>Include sound in MP4</span>
          </label>}
        </div>
      </section>}
      <section className="editor-theme" aria-labelledby="theme-heading">
        <div className="theme-heading">
          <h2 id="theme-heading">Theme</h2>
          <button className="icon-btn" title="Generate palettes" aria-label="Generate palettes" disabled={!!editing}
            onClick={() => setGeneratedPalettes(generatePalettes(variant.props.theme))}><RefreshCw size={18} /></button>
        </div>
        <div className="theme-content">
          <div className="palettes" role="group" aria-label="Palettes">
            {palettes.map((p) => <button key={p.name} className={`palette-btn ${JSON.stringify(p.colors) === JSON.stringify(props.theme) ? 'on' : ''}`}
              title={p.name} aria-label={p.name} aria-pressed={JSON.stringify(p.colors) === JSON.stringify(props.theme)}
              disabled={!!editing} onClick={() => { h.set({...props, theme: p.colors}); track('color_edit', {variant_id: variant.id, color_role: 'palette'}); }}>
              {THEME_ROLES.map((role) => <span key={role} style={{background: p.colors[role]}} />)}
            </button>)}
          </div>
          <div className="theme-colors">
            {THEME_ROLES.map((key) => (
              <div className="theme-color" key={key}>
                <label className="swatch" style={{background: props.theme[key]}} title={`Pick ${THEME_LABELS[key]}`}>
                  <input type="color" aria-label={`Pick ${THEME_LABELS[key]}`} value={props.theme[key]} disabled={!!editing} onChange={(e) => changeHex(key, e.target.value)} />
                </label>
                <label htmlFor={`hex-${key}`}>{THEME_LABELS[key]}</label>
                <input id={`hex-${key}`} className="hex" aria-label={`${THEME_LABELS[key]} hex`} value={hexes[key]} spellCheck={false} disabled={!!editing}
                  aria-invalid={!/^#[0-9a-f]{6}$/i.test(hexes[key])} onChange={(e) => changeHex(key, e.target.value.trim())}
                  onBlur={() => setHexes((old) => ({...old, [key]: props.theme[key]}))} />
              </div>
            ))}
          </div>
        </div>
      </section>
      {slots.length > 0 && media && <section className="editor-theme editor-photos" aria-labelledby="images-heading">
        <div className="theme-heading"><h2 id="images-heading">Images</h2></div>
        <ImagePicker template={variant.template} slots={slots.map((s) => ({slot: s, options: slotOptions(c.schema, s)}))} media={media} disabled={!!editing}
          onChange={(slot, id) => { h.set({...props, media: {...media, [slot]: id}} as VideoProps); track('image_edit', {variant_id: variant.id, image_slot: slot}); }} />
      </section>}
      <section className="video-details" aria-labelledby="video-details-heading">
        <h2 id="video-details-heading">Video details</h2>
        <div className="tags detail-badges">
          <span className="tag model-badge">Generated by {generationLabel(variant.tmpl.generation)}</span>
          <span className={`tag engine-badge ${c.engine}`}>Built with {ENGINE_LABELS[c.engine]}</span>
        </div>
        <p>{variant.description}</p>
        <div className="creative-brief">
          <div><h3>Creative brief</h3><button className="link-btn" onClick={copyBrief} aria-label={briefCopied ? 'Creative brief copied' : 'Copy creative brief'}>{briefCopied ? <Check size={14} /> : <Copy size={14} />}{briefCopied ? 'Copied' : 'Copy'}</button></div>
          <p>{variant.tmpl.prompt}</p>
        </div>
        <p className="small muted">Free to copy, modify, share, and use commercially. No attribution required. Template v{version}. Updated {variant.updatedAt}. Created by {variant.creator}. {sharingConfigured ? 'Free full-resolution MP4 export.' : 'Hosted MP4 export is not available yet.'}</p>
        <div className="tags">
          {[...new Set([variant.purpose, ...variant.placement, ...variant.style, variant.tone,
            variant.energy <= 2 ? 'Calm' : variant.energy === 3 ? 'Medium' : 'High',
            variant.format, `${variant.seconds}s`])].map((label) => <span className="tag" key={label}>{label}</span>)}
        </div>
      </section>
      {notice && <div className="editor-notice" role="status">{notice}<button className="link-btn" onClick={() => setNotice('')}>Dismiss</button></div>}
    </main>
  );
}
