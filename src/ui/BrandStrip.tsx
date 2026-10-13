import {Pipette, RefreshCw} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import type {Theme} from '../videos/vocab';
import {track} from '../services/analytics';
import {kitActive, setBrandKit, useBrandKit} from './brandKit';
import {PRESETS, generatePalettes} from './palettes';
import {ThemeControls, type Palette, type ThemeChange} from './ThemeControls';

// Generated palettes skip the editor's "Original" entry: here Original means "kit off".
const generate = (): Palette[] => generatePalettes(PRESETS[0].colors).slice(1);

export function BrandStrip() {
  const kit = useBrandKit();
  const on = kitActive(kit);
  const [generated, setGenerated] = useState<Palette[] | null>(null);
  const [customizing, setCustomizing] = useState(false);
  const palettes = generated ?? PRESETS;
  const theme = kit.theme ?? palettes[0].colors;
  // Color pickers fire on every drag step; report one custom edit per pause.
  const customTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(customTimer.current), []);

  const setEnabled = (enabled: boolean, next: Theme | null = kit.theme) => {
    if (enabled !== on) track('brandkit_toggle', {state: enabled ? 'on' : 'off'});
    setBrandKit({enabled: enabled && !!next, theme: next});
  };
  const choose = (next: Theme, change: ThemeChange) => {
    setEnabled(true, next);
    if (change.kind === 'palette') {
      track('brandkit_theme', {source: generated ? 'generated' : 'preset'});
    } else {
      window.clearTimeout(customTimer.current);
      customTimer.current = window.setTimeout(() => track('brandkit_theme', {source: 'custom'}), 800);
    }
  };

  return (
    <section className={`brand-strip ${on ? 'on' : ''}`} aria-labelledby="brand-strip-label">
      <div className="brand-strip-inner">
        <span className="brand-label" id="brand-strip-label">Preview in your brand colors</span>
        <ThemeControls theme={theme} palettes={palettes} selected={on} showColors={customizing} onChange={choose} idPrefix="brand"
          lead={<button type="button" className={`palette-btn none ${on ? '' : 'on'}`} aria-pressed={!on} title="Show each video's own colors"
            onClick={() => setEnabled(false)}>Original</button>} />
        <div className="brand-actions">
          <button type="button" className="icon-btn" title="Generate palettes" aria-label="Generate palettes" onClick={() => setGenerated(generate())}>
            <RefreshCw size={16} />
          </button>
          <button type="button" className={`brand-customize ${customizing ? 'on' : ''}`} aria-expanded={customizing} title="Customize colors" aria-label="Customize colors"
            onClick={() => setCustomizing((c) => !c)}>
            <Pipette size={15} /><span>Customize</span>
          </button>
          <label className="switch" title={on ? 'Turn off brand colors' : 'Turn on brand colors'}>
            <input type="checkbox" role="switch" aria-label="Brand colors" checked={on} onChange={(e) => setEnabled(e.target.checked, kit.theme ?? theme)} />
            <span />
          </label>
        </div>
      </div>
    </section>
  );
}
