import {ImageUp, LoaderCircle, Trash2} from 'lucide-react';
import {useRef, useState} from 'react';
import type {Logo} from '../videos/logo';
import {LOGO_MAX_BYTES, LOGO_TYPES} from '../videos/logo';
import {logoUrl, sharingConfigured, uploadLogo} from '../services/sharing';
import {track} from '../services/analytics';
import {useAccount} from './Account';

// Upload, tint, and remove a logo. Uploads need a free Google account: the file is stored on our servers.
export function LogoControls({logo, onChange, disabled = false, source, brandName}: {
  logo: Logo | null | undefined; onChange: (logo: Logo | null) => void; disabled?: boolean; source: 'editor' | 'brandkit'; brandName?: string;
}) {
  const account = useAccount();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [opaque, setOpaque] = useState(false);
  // Signed in: open the file picker in the click itself, or browsers block it. Signed out: sign in first,
  // then the next click opens the picker.
  const pick = async () => {
    setError('');
    if (account.user) { input.current?.click(); return; }
    try { await account.requireSignIn(); } catch { return; }
    setError('Signed in. Choose Upload logo again to pick a file.');
  };
  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > LOGO_MAX_BYTES) { setError('Use a logo of 1 MB or less.'); return; }
    setBusy(true); setError('');
    try {
      const result = await uploadLogo(file);
      setOpaque(!result.transparent);
      onChange({id: result.id, ratio: result.ratio, mono: result.transparent});
      track('logo_upload', {source, kind: file.type === 'image/svg+xml' ? 'svg' : 'raster'});
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  };
  if (!sharingConfigured) return null;
  return (
    <div className="logo-controls">
      <div className="logo-row">
        <div className={`logo-preview ${logo?.mono ? 'mono' : ''}`} aria-hidden={!logo}>
          {logo ? (logo.mono
            ? <span role="img" aria-label={`${brandName || 'Brand'} logo`} style={{WebkitMaskImage: `url("${logoUrl(logo.id)}")`, maskImage: `url("${logoUrl(logo.id)}")`}} />
            : <img src={logoUrl(logo.id)} alt={`${brandName || 'Brand'} logo`} />)
            : <span className="logo-empty">{brandName || 'Your logo'}</span>}
        </div>
        <button type="button" className="logo-btn" disabled={disabled || busy} onClick={() => void pick()}
          title={account.user ? 'Upload a PNG, JPEG, WebP, or SVG logo' : 'Sign in to upload a logo'}>
          {busy ? <LoaderCircle className="spin" size={16} /> : <ImageUp size={16} />}<span>{logo ? 'Replace' : 'Upload logo'}</span>
        </button>
        {logo && <button type="button" className="icon-btn" title="Remove logo" aria-label="Remove logo" disabled={disabled || busy}
          onClick={() => { onChange(null); track('logo_remove', {source}); }}><Trash2 size={16} /></button>}
      </div>
      {logo && <div className="segmented logo-mode" role="radiogroup" aria-label="Logo color">
        <button type="button" role="radio" aria-checked={logo.mono} className={logo.mono ? 'on' : ''} disabled={disabled || opaque}
          title={opaque ? 'Needs a logo with a transparent background' : 'Draw the logo in the text color'}
          onClick={() => onChange({...logo, mono: true})}>Text color</button>
        <button type="button" role="radio" aria-checked={!logo.mono} className={!logo.mono ? 'on' : ''} disabled={disabled}
          title="Keep the logo's own colors" onClick={() => onChange({...logo, mono: false})}>Original</button>
      </div>}
      {error && <p className="logo-error" role="alert">{error}</p>}
      <input ref={input} type="file" accept={LOGO_TYPES.join(',')} hidden onChange={(e) => void upload(e.target.files?.[0])} />
    </div>
  );
}
