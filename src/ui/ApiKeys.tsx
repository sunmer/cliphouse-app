import {Check, Copy, KeyRound, Trash2} from 'lucide-react';
import {useEffect, useState} from 'react';
import {createApiKey, listApiKeys, revokeApiKey, sharingConfigured, type ApiKey} from '../services/sharing';

const MAX_KEYS = 2;

// API keys raise the MCP rate limit. A new key is shown once; only its last four characters are kept.
export function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [fresh, setFresh] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!sharingConfigured) return;
    listApiKeys().then(setKeys).catch((e) => setError((e as Error).message));
  }, []);
  if (!sharingConfigured) return null;
  const create = async () => {
    setBusy('create'); setError(''); setCopied(false);
    try {
      const created = await createApiKey();
      setFresh(created.key);
      setKeys((old) => [{id: created.id, createdAt: created.createdAt, last4: created.last4}, ...(old ?? [])]);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(''); }
  };
  const revoke = async (id: string) => {
    if (!window.confirm('Revoke this API key? Agents that use it will be rate-limited as anonymous.')) return;
    setBusy(id); setError('');
    try { await revokeApiKey(id); setKeys((old) => (old ?? []).filter((k) => k.id !== id)); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(''); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(fresh); setCopied(true); }
    catch { setError('Select the key and copy it.'); }
  };
  return <section className="account-shares" aria-label="API keys">
    <h3>MCP API keys</h3>
    {fresh && <div className="api-key-fresh">
      <input className="share-link" readOnly value={fresh} aria-label="New API key" onFocus={(e) => e.currentTarget.select()} />
      <button className="icon-btn ghost" title={copied ? 'Copied' : 'Copy key'} aria-label="Copy key" onClick={() => void copy()}>
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
      <p className="muted">Copy this key now. It is not shown again.</p>
    </div>}
    {keys?.map((k) => <div className="account-share" key={k.id}>
      <span><KeyRound size={14} aria-hidden="true" /> chk_...{k.last4}</span>
      <button className="icon-btn ghost" title={`Revoke key ending ${k.last4}`} aria-label={`Revoke key ending ${k.last4}`}
        disabled={!!busy} onClick={() => void revoke(k.id)}><Trash2 size={16} /></button>
    </div>)}
    {keys && keys.length < MAX_KEYS && <button className="link-btn" disabled={!!busy} onClick={() => void create()}>
      {busy === 'create' ? 'Creating...' : 'Create API key'}
    </button>}
    {error && <p className="account-error" role="alert">{error}</p>}
  </section>;
}
