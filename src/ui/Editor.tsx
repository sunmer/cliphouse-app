import {ArrowLeft, Bot, Check, Copy, Download, Eye, EyeOff, FileCode, LoaderCircle, Maximize, Minimize, Music, Palette, Pause, Play, Redo2, RefreshCw, RotateCcw, Save, Share2, Undo2, Volume2, VolumeX, X} from 'lucide-react';
import {useCallback, useEffect, useMemo, useRef, useState, type CSSProperties} from 'react';
import type {Variant} from '../catalog/catalog';
import {generationLabel} from '../catalog/generation';
import {ROLES, type Role, type VideoProps} from '../videos/contract';
import {ENGINE_LABELS} from '../videos/engine';
import {mediaOf, mediaSlots, slotOptions} from '../videos/media/catalog';
import {hideableRoles, isMusicSchema, scoreOf} from '../videos/music/schema';
import {compositionFor} from '../videos/registry';
import {currentVersion, handoffPath, sourcePath, specPath} from '../agent/versions';
import {readHandoff} from '../agent/handoff';
import {applyKit, useBrandKit} from './brandKit';
import {ThemeControls} from './ThemeControls';
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
import {useTrackAudio} from './useTrackAudio';
import {LEGACY_TRACKS, libraryAudioOf, trackFor, usesLibrary} from '../music/schema';
import {TRACKS, trackById} from '../music/library';
import {templateKind} from '../catalog/catalog';
import {applyList} from '../poc/lists';
import type {PocEntry} from '../poc/registry';
import {scoreOf as beatScoreOf} from '../videos/beat/schema';
import {applyList as applyBeatList, bpmOf, countOf, totalBars} from '../videos/beat/index';
import {musicOf, songKey} from '../videos/song/index';
import type {ListGroup} from '../poc/lists';

// Matches the phone layout in styles.css.
const COMPACT_QUERY = "(max-width: 700px), (pointer: coarse) and (max-width: 1024px)";
function useMediaQuery(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return match;
}

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

export function Editor({variant, sharedProps, shareId, draftId, published, openShare, handoff, templateVersion, poc}: {
  variant: Variant; sharedProps?: VideoProps; shareId?: string; draftId?: string; published?: SharedVideo; openShare?: boolean;
  handoff?: string; templateVersion?: number; poc?: PocEntry;
}) {
  const latest = poc ? 1 : currentVersion(variant.template);
  const [version, versionError] = useMemo(() => {
    if (poc) return [1, ''];
    try { compositionFor(variant.template, templateVersion ?? latest); return [templateVersion ?? latest, '']; }
    catch (e) { return [latest, (e as Error).message]; }
  }, [variant.template, templateVersion, latest, poc]);
  // Edits of an older template version stay pinned to it; local drafts of older versions get a separate key.
  const localKey = version === latest ? variant.id : `${variant.id}@v${version}`;
  const account = useAccount();
  const draft = useRef<{uid: string; id: string} | null>(draftId && account.user ? {uid: account.user.uid, id: draftId} : null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportedKey, setExportedKey] = useState('');
  const [savedKey, setSavedKey] = useState(draftId ? JSON.stringify(sharedProps) : '');
  const c = poc ? poc.composition : compositionFor(variant.template, version);
  const kit = useBrandKit();
  const incoming = useMemo(() => handoff === undefined ? null : readHandoff(handoff, c.schema), [handoff, c]);
  // A video without a local edit, draft, share, or agent handoff opens in the brand kit colors. POC entries skip the kit.
  // The kit is read once per opened video, so changing it elsewhere does not rewrite an open edit.
  const fresh = useMemo(() => poc ? variant.props : applyKit(variant.props, kit), [variant, poc]);
  const initial = useMemo(() => {
    if (sharedProps) return sharedProps;
    if (incoming?.ok) return incoming.props;
    try {
      const result = c.schema.safeParse(JSON.parse(localStorage.getItem(storageKey(localKey)) ?? 'null'));
      // Earlier versions stored every opened video. A stored copy of the template's own props is not an edit.
      return result.success && JSON.stringify(result.data) !== JSON.stringify(variant.props) ? result.data as VideoProps : fresh;
    } catch { return fresh; }
  }, [c, variant, fresh, sharedProps, incoming, localKey]);
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
  const [agentBannerClosed, setAgentBannerClosed] = useState(false);
  const [notice, setNotice] = useState(() => versionError || (incoming && !incoming.ok ? `Agent link rejected. ${incoming.error} The video was not changed.` : ''));
  // One side panel at a time slides in from the right over the stage: music or theme.
  const compact = useMediaQuery(COMPACT_QUERY);
  const [panel, setPanel] = useState<'music' | 'theme' | null>(null);
  const [shareMenu, setShareMenu] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const openShareDialog = useRef<(() => void) | null>(null);
  const togglePanel = (next: 'music' | 'theme') => {
    setShareMenu(false);
    setPanel((p) => p === next ? null : next);
    track('panel_open', {variant_id: variant.id, panel: next});
  };
  useEffect(() => {
    if (!shareMenu) return;
    const close = (e: PointerEvent) => { if (!shareMenuRef.current?.contains(e.target as Node)) setShareMenu(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setShareMenu(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [shareMenu]);
  const defaultPalettes = useMemo(() => derivePalettes(variant.props.theme), [variant.props.theme]);
  const [generatedPalettes, setGeneratedPalettes] = useState<typeof defaultPalettes | null>(null);
  const palettes = generatedPalettes ?? defaultPalettes;
  const slots = mediaSlots(c.schema);
  const media = mediaOf(props);
  // Music templates: sound starts muted in the editor and only plays after the user turns it on.
  // Beat templates: the score sets the music and the list. Their sound is on by default in the MP4.
  const beat = beatScoreOf(c);
  // A beat template has sound only when it has a song. Without one it is a silent template with a beat-timed picture.
  const beatMusic = beat ? musicOf(c) : undefined;
  // Library templates: the user picks a track from the music library.
  // Older music templates (generated scores) now play a library track too; their props keep {enabled} only.
  const library = usesLibrary(c.schema) || !!LEGACY_TRACKS[variant.template];
  const pickable = usesLibrary(c.schema);
  const libraryAudio = usesLibrary(c.schema) ? libraryAudioOf(props) : undefined;
  const libraryTrack = library ? trackFor(variant.template, props) : undefined;
  const music = isMusicSchema(c.schema) && (library || !beat || !!beatMusic);
  const score = beat ? undefined : scoreOf(c);
  const optional = hideableRoles(c.schema);
  const hidden = (props as {hidden?: Role[]}).hidden ?? [];
  const exportSound = !!(props as {audio?: {enabled: boolean}}).audio?.enabled;
  const [listening, setListening] = useState(false);
  const count = beat ? countOf(beat, props) : poc?.lists[0] ? (poc.lists[0].storage.kind === 'roles' ? poc.lists[0].storage.roles.length - hidden.filter((r) => poc.lists[0].storage.kind === 'roles' && poc.lists[0].storage.roles.includes(r)).length : 0) : 0;
  const custom = useMemo(() => library ? undefined : beat ? beatMusic ? {key: songKey(beatMusic.score, beatMusic.song, count), message: {id: 1, beat, song: beatMusic.song, count},
    worker: () => new Worker(new URL('./audioWorker.ts', import.meta.url), {type: 'module'})} : undefined
    : poc?.sound ? {key: `tickerbeat:${count}`, message: {id: 1, count},
    worker: () => new Worker(new URL('../poc/tickerbeat/audioWorker.ts', import.meta.url), {type: 'module'})} : undefined, [library, beat, beatMusic, poc, count]);
  // The editor's list contract for a beat score: the packed `list` role, limits from the score.
  const lists = useMemo<ListGroup[] | undefined>(() => beat?.list
    ? [{id: 'list', label: beat.list.label, storage: {kind: 'packed', role: 'list'}, min: beat.list.min, max: beat.list.max, itemMax: beat.list.itemMax, format: beat.list.format}]
    : poc?.lists, [beat, poc]);
  const scoreAudio = useScoreAudio({score, fps: c.fps, props, player, enabled: music && !library && listening, custom});
  const trackAudio = useTrackAudio({track: libraryTrack, duration: c.durationInFrames / c.fps, fps: c.fps, player, enabled: library && listening});
  const audio = library ? trackAudio : scoreAudio;
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
    h.set({...props, audio: libraryAudio ? {...libraryAudio, enabled} : {enabled}} as VideoProps);
  };
  const pickTrack = (id: string) => {
    h.set({...props, audio: {enabled: true, track: id}} as VideoProps);
    if (!listening) { audio.unlock(); setListening(true); }
    track('music_pick', {variant_id: variant.id, track_id: id});
  };

  useEffect(() => { track('editor_open', {variant_id: variant.id, template_kind: templateKind(variant.tmpl)}); }, [variant.id, variant.tmpl]);
  // Only catalog videos count toward the account gate. Shared links, saved edits, and agent handoffs never do.
  const {noteVideoOpen, gated} = account;
  useEffect(() => { if (!shareId && !draftId && handoff === undefined) noteVideoOpen(variant.id); }, [variant.id, shareId, draftId, handoff, account.ready]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (gated) player.current?.pause(); }, [gated]);
  useEffect(() => {
    if (!incoming) return;
    track(incoming.ok ? 'agent_handoff_open' : 'agent_handoff_reject', {variant_id: variant.id});
    // Remove the props from the address bar after loading so reloads use the saved local edit.
    if (incoming.ok) history.replaceState(null, '', `${location.pathname}${location.search}#/v/${variant.id}${version === latest ? '' : `?v=${version}`}`);
  }, [incoming, variant.id, version, latest]);
  useEffect(() => {
    // Account drafts remain private; do not copy them into anonymous browser storage.
    if (draftId) return;
    const key = storageKey(shareId ? `share:${shareId}` : localKey);
    try {
      // An untouched video is not a local edit, so the next visit opens it in the current brand kit colors.
      if (!shareId && JSON.stringify(props) === JSON.stringify(fresh)) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(props));
    } catch { setNotice('Changes could not be saved on this device. Save this edit to keep a copy.'); }
  }, [props, localKey, shareId, draftId, fresh]);
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
      if (music && exportSound) track('audio_export', {variant_id: variant.id});
    } catch (e) { setNotice((e as Error).message); }
    finally { setExporting(false); }
  };

  // The playback bar: attached under the video on desktop, floating at the stage edge on phones.
  const playbar = (kind: "attached" | "floating") => (
    <div className={`editor-bottom ${kind}`}>
        <button className="overlay-btn playback-btn" title={playing ? 'Pause' : 'Play'} aria-label={playing ? 'Pause' : 'Play'}
          disabled={!!editing} onClick={() => player.current?.toggle()}>{playing ? <Pause size={20} /> : <Play size={20} />}</button>
        {music && <button className={`overlay-btn sound-btn ${listening ? 'on' : ''}`} title={listening ? 'Mute sound' : 'Play sound'} aria-label={listening ? 'Mute sound' : 'Play sound'}
          aria-pressed={listening} data-audio-ready={audio.ready ? 'true' : 'false'} onClick={toggleSound}>{listening ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>}
        <Timeline meta={c} player={player} focusRole={editing} disabled={!!editing} />
    </div>
  );

  return (
    <main className="editor-page" inert={saving || gated} aria-busy={saving}>
      <div ref={immersive} className={`immersive-editor ${c.width > c.height ? 'landscape-video' : ''} ${expanded ? 'expanded' : ''} ${panel ? 'panel-open' : ''}`} style={{'--video-ratio': c.width / c.height} as CSSProperties}>
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
              lists={lists} onCommitList={(group, items) => { h.set(beat ? applyBeatList(props, items) : applyList(group, props, items)); track('text_edit', {variant_id: variant.id, text_role: group.id}); }}
              onCommit={(role, value) => { h.set({...props, texts: {...props.texts, [role]: value}}); track('text_edit', {variant_id: variant.id, text_role: role}); }}>
              <VideoPlayer ref={player} composition={c} props={props} autoPlay={playing} style={{width: '100%', height: '100%'}} />
            </TextCanvas>
            {!compact && playbar("attached")}
          </div>
        </div>
        {compact && playbar("floating")}
        <nav className="editor-tools" aria-label="Video tools">
          {!poc && <StarButton id={variant.id} title={variant.title} overlay />}
          <button className="overlay-btn mobile-expand" title={expanded ? 'Exit fullscreen' : 'Fullscreen'} aria-label={expanded ? 'Exit fullscreen' : 'Fullscreen'}
            disabled={!!editing} onClick={toggleExpanded}>{expanded ? <Minimize size={20} /> : <Maximize size={20} />}</button>
          <button className={`overlay-btn ${panel === 'theme' ? 'on' : ''}`} title="Theme" aria-label="Theme" aria-pressed={panel === 'theme'} aria-controls="editor-panel"
            disabled={!!editing} onClick={() => togglePanel('theme')}><Palette size={20} /></button>
          {music && <button className={`overlay-btn ${panel === 'music' ? 'on' : ''}`} title="Music" aria-label="Music" aria-pressed={panel === 'music'} aria-controls="editor-panel"
            disabled={!!editing} onClick={() => togglePanel('music')}><Music size={20} /></button>}
          <button className="overlay-btn" title="Reset to original" aria-label="Reset to original"
            disabled={!!editing || JSON.stringify(props) === JSON.stringify(variant.props)} onClick={() => h.set(variant.props)}><RotateCcw size={20} /></button>
          {!poc && <>
          <button className="overlay-btn" title="Save video" aria-label="Save video" disabled={!!editing || saving}
            onClick={() => void saveAndOpen()}>{saving ? <LoaderCircle className="spin" size={20} /> : savedKey === JSON.stringify(props) ? <Check size={20} /> : <Save size={20} />}</button>
          <div className="share-menu-wrap" ref={shareMenuRef}>
            <button className={`overlay-btn ${shareMenu ? 'on' : ''}`} title="Share and download" aria-label="Share and download" aria-haspopup="menu" aria-expanded={shareMenu}
              disabled={!!editing || saving} onClick={() => { setPanel(null); setShareMenu((s) => !s); }}><Share2 size={20} /></button>
            {shareMenu && <div className="share-menu" role="menu" aria-label="Share and download">
              <button role="menuitem" className="menu-item" onClick={() => openShareDialog.current?.()}><Share2 size={17} />Share to socials</button>
              {sharingConfigured && <button role="menuitem" className="menu-item" disabled={exporting} onClick={() => { setShareMenu(false); void downloadMp4(); }}>
                {exporting ? <LoaderCircle className="spin" size={17} /> : <Download size={17} />}Download MP4</button>}
              <button role="menuitem" className="menu-item" onClick={() => { void copyAgentLink(); }}>
                {copied ? <Check size={17} /> : <Bot size={17} />}{copied ? 'Agent link copied' : 'Copy agent link'}</button>
              <a role="menuitem" className="menu-item" download href={`${import.meta.env.BASE_URL.replace(/\/$/, '')}${sourcePath(variant.template, version)}`}
                onClick={() => { setShareMenu(false); track('source_download', {variant_id: variant.id}); }}><FileCode size={17} />Download source <span className="menu-note">v{version}</span></a>
            </div>}
          </div>
          <ShareButton variant={variant} props={props} templateVersion={version} disabled={!!editing || saving} save={save} publishedVideo={published} initiallyOpen={openShare}
            beforeOpen={() => { setShareMenu(false); player.current?.pause(); if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); }}
            trigger={(open) => { openShareDialog.current = open; return null; }} />
          </>}
        </nav>
        {panel && <aside id="editor-panel" className="editor-panel" aria-label={panel === 'music' ? 'Music' : 'Theme'}>
          <div className="panel-heading">
            <h2>{panel === 'music' ? 'Music' : 'Theme'}</h2>
            {panel === 'theme' && <button className="icon-btn" title="Generate palettes" aria-label="Generate palettes" disabled={!!editing}
              onClick={() => setGeneratedPalettes(generatePalettes(variant.props.theme))}><RefreshCw size={17} /></button>}
            <button className="icon-btn" title="Close" aria-label="Close panel" onClick={() => setPanel(null)}><X size={17} /></button>
          </div>
          {panel === 'music' && <div className="panel-body">
            {libraryTrack && <p className="music-facts">{trackById(libraryTrack)?.genre} · {trackById(libraryTrack)?.bpm} BPM · fades in and out</p>}
            {pickable && libraryAudio ? <div className="track-list" role="radiogroup" aria-label="Music track">
              {TRACKS.map((t) => {
                const on = t.id === libraryAudio.track;
                return <button key={t.id} type="button" role="radio" aria-checked={on} className={`track-btn ${on ? 'on' : ''}`} disabled={!!editing}
                  title={`${t.title}, ${t.genre}, ${t.bpm} BPM`} onClick={() => pickTrack(t.id)}>
                  <Music size={15} aria-hidden="true" /><span className="track-title">{t.title}</span><span className="track-genre">{t.genre}</span>
                </button>;
              })}
            </div> : libraryTrack ? <p className="muted small">This template plays {trackById(libraryTrack)?.title}.</p> : null}
            {!beat && optional.length > 0 && <div className="role-toggles" role="group" aria-label="Optional text">
              {optional.map((role) => {
                const shown = !hidden.includes(role);
                return <button key={role} className={`role-toggle ${shown ? 'on' : ''}`} aria-pressed={shown} disabled={!!editing}
                  title={`${shown ? 'Hide' : 'Show'} ${ROLES[role].label.toLowerCase()}`} aria-label={`${shown ? 'Hide' : 'Show'} ${ROLES[role].label}`}
                  onClick={() => toggleRole(role)}>{shown ? <Eye size={16} /> : <EyeOff size={16} />}<span>{ROLES[role].label}</span></button>;
              })}
            </div>}
            <label className="export-sound">
              <input type="checkbox" checked={exportSound} disabled={!!editing} onChange={(e) => setExportSound(e.target.checked)} />
              <span>Include music in MP4</span>
            </label>
            {library && <p className="music-facts">Royalty-free</p>}
          </div>}
          {panel === 'theme' && <div className="panel-body">
            <ThemeControls theme={props.theme} palettes={palettes} disabled={!!editing}
              heading="Customize" onChange={(theme, change) => {
                h.set({...props, theme});
                track('color_edit', {variant_id: variant.id, color_role: change.kind === 'palette' ? 'palette' : change.role});
              }} />
          </div>}
        </aside>}
      </div>
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
        {shareId && <p className="small muted">Made with <a href={`${import.meta.env.BASE_URL}agents/`}>cliphou.se</a>. Make your own from your coding agent.</p>}
        <div className="tags">
          {[...new Set([variant.purpose, ...variant.placement, ...variant.style, variant.tone,
            variant.energy <= 2 ? 'Calm' : variant.energy === 3 ? 'Medium' : 'High',
            variant.format, `${variant.seconds}s`])].map((label) => <span className="tag" key={label}>{label}</span>)}
        </div>
      </section>
      {incoming?.ok && !agentBannerClosed && <div className="agent-banner" role="note"><Bot size={16} /><span>Made with your coding agent.</span>
        <a href={`${import.meta.env.BASE_URL}agents/`} onClick={() => track('agent_banner_click', {variant_id: variant.id})}>Get the skill</a>
        <button className="overlay-btn" title="Dismiss" aria-label="Dismiss" onClick={() => setAgentBannerClosed(true)}><X size={14} /></button></div>}
      {notice && <div className="editor-notice" role="status">{notice}<button className="link-btn" onClick={() => setNotice('')}>Dismiss</button></div>}
    </main>
  );
}
