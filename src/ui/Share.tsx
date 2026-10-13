import {Check, Copy, LoaderCircle, Share2, X} from 'lucide-react';
import {useEffect, useRef, useState, type ReactNode} from 'react';
import type {Variant} from '../catalog/catalog';
import type {VideoProps} from '../videos/contract';
import {publishVideo, sharingConfigured, type SharedVideo} from '../services/sharing';
import {track} from '../services/analytics';
import {useAccount} from './Account';
import {compositionFor} from '../videos/registry';
import {VideoThumbnail} from './VideoPlayer';

// Brand marks are not in lucide; these are the networks' plain glyphs.
const XMark = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.9 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" /></svg>;
const LinkedInMark = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11H3v-11Zm6.5 0h3.8v1.5h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1v5.45h-4v-4.83c0-1.15-.02-2.63-1.6-2.63-1.6 0-1.85 1.25-1.85 2.55v4.91h-4v-11Z" /></svg>;

export function ShareButton({variant, props, templateVersion, disabled, beforeOpen, save, publishedVideo, initiallyOpen, trigger}: {
  variant: Variant; props: VideoProps; templateVersion: number; disabled: boolean; beforeOpen: () => void; save: () => Promise<string>;
  publishedVideo?: SharedVideo; initiallyOpen?: boolean;
  /** Render a custom opener (for example a menu item) instead of the default round button. */
  trigger?: (open: () => void) => ReactNode;
}) {
  const account = useAccount();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(!!initiallyOpen);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<{key: string; value: SharedVideo} | null>(
    publishedVideo ? {key: JSON.stringify(publishedVideo.props), value: publishedVideo} : null);
  const composition = compositionFor(variant.template, templateVersion);
  const key = JSON.stringify(props);
  const published = result?.key === key ? result.value : null;
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (open) dialog.current?.showModal(); else dialog.current?.close();
  }, [open]);
  const close = () => { if (!busy) setOpen(false); };
  const publish = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await save();
      const value = await publishVideo(variant.id, props, templateVersion);
      if (!mounted.current) return;
      setResult({key, value});
      track('share_publish', {variant_id: variant.id});
      location.hash = `/s/${value.id}?share=1`;
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    } finally { if (mounted.current) setBusy(false); }
  };
  const copy = async () => {
    if (!published) return;
    try { await navigator.clipboard.writeText(published.url); setCopied(true); }
    catch { setError('Select the link below to copy it.'); }
  };
  const share = async () => {
    if (!published) return;
    try { await navigator.share({url: published.url, title: published.title}); }
    catch (e) { if ((e as Error).name !== 'AbortError') setError('The share sheet could not open. Copy the link instead.'); }
  };
  const openDialog = () => { beforeOpen(); setCopied(false); setError(''); setOpen(true); };
  const social = (network: 'x' | 'linkedin') => {
    if (!published) return;
    const url = encodeURIComponent(published.url);
    const href = network === 'x'
      ? `https://x.com/intent/post?url=${url}&text=${encodeURIComponent(published.title)}`
      : `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    window.open(href, '_blank', 'noopener,noreferrer');
    track('share_social', {variant_id: variant.id, network});
  };
  return <>
    {trigger ? trigger(openDialog) : <button className="overlay-btn" title="Share video" aria-label="Share video" disabled={disabled}
      onClick={openDialog}><Share2 size={20} /></button>}
    <dialog ref={dialog} className="account-dialog share-dialog" aria-labelledby="share-title"
      onCancel={(e) => { e.preventDefault(); close(); }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="dialog-heading">
        <h2 id="share-title">Share video</h2>
        <button className="icon-btn ghost" aria-label="Close share" disabled={busy} onClick={close}><X size={18} /></button>
      </div>
      {published ? <>
        <img className="share-preview" src={published.image} alt={published.title} />
        <label className="share-link-label" htmlFor="share-link">Public link</label>
        <input id="share-link" className="share-link" value={published.url} readOnly onFocus={(e) => e.target.select()} />
        <div className="share-actions">
          <button className="account-action" onClick={copy}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? 'Copied' : 'Copy link'}</button>
          <button className="account-action" onClick={() => social('x')}><XMark />Post on X</button>
          <button className="account-action" onClick={() => social('linkedin')}><LinkedInMark />LinkedIn</button>
          {typeof navigator.share === 'function' && <button className="account-action" onClick={share}><Share2 size={17} />Share</button>}
        </div>
      </> : <>
        <VideoThumbnail composition={composition} props={props}
          style={{width: '100%', aspectRatio: `${composition.width} / ${composition.height}`, maxHeight: 220, objectFit: 'contain'}} />
        <p className="muted">Publishing makes a copy of this edit visible to anyone with the link.</p>
        {!sharingConfigured ? <p role="status">Publishing is not available yet. Your edits remain on this device.</p>
          : !account.ready ? <p role="status">Checking your account...</p>
          : <button className="account-action" disabled={busy} onClick={publish}>
            {busy ? <LoaderCircle className="spin" size={17} /> : <Share2 size={17} />}{busy ? 'Preparing link...' : account.user ? 'Publish link' : 'Sign in to publish'}
          </button>}
        {busy && <p className="muted" role="status">Saving your edit and preparing its thumbnail.</p>}
      </>}
      {error && <p className="account-error" role="alert">{error}</p>}
    </dialog>
  </>;
}
