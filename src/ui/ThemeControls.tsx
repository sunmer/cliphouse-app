import {useEffect, useState, type ReactNode} from 'react';
import {THEME_LABELS, THEME_ROLES, type Theme, type ThemeRole} from '../videos/vocab';
import {isHex} from './brandKit';

export type Palette = {name: string; colors: Theme};
export type ThemeChange = {kind: 'palette'; name: string} | {kind: 'color'; role: ThemeRole};

const same = (a: Theme, b: Theme) => THEME_ROLES.every((r) => a[r].toLowerCase() === b[r].toLowerCase());

// The palette grid and the 5-swatch editor. The editor's Theme panel and the gallery's brand strip both use it.
export function ThemeControls({theme, palettes, onChange, disabled = false, selected = true, showColors = true, heading, lead, idPrefix = 'theme'}: {
  theme: Theme;
  palettes: Palette[];
  onChange: (theme: Theme, change: ThemeChange) => void;
  disabled?: boolean;
  // False shows no palette as selected, for example while the brand kit is off.
  selected?: boolean;
  showColors?: boolean;
  heading?: string;
  lead?: ReactNode;
  idPrefix?: string;
}) {
  const [hexes, setHexes] = useState(theme);
  useEffect(() => setHexes(theme), [theme]);
  const changeHex = (role: ThemeRole, value: string) => {
    setHexes((old) => ({...old, [role]: value}));
    if (isHex(value) && value.toLowerCase() !== theme[role].toLowerCase()) onChange({...theme, [role]: value}, {kind: 'color', role});
  };

  return (
    <>
      <div className="palettes" role="group" aria-label="Palettes">
        {lead}
        {palettes.map((p) => {
          const on = selected && same(p.colors, theme);
          return (
            <button key={p.name} type="button" className={`palette-btn ${on ? 'on' : ''}`} title={p.name} aria-label={p.name} aria-pressed={on}
              disabled={disabled} onClick={() => onChange(p.colors, {kind: 'palette', name: p.name})}>
              {THEME_ROLES.map((role) => <span key={role} style={{background: p.colors[role]}} />)}
            </button>
          );
        })}
      </div>
      {showColors && heading && <h3 className="panel-sub">{heading}</h3>}
      {showColors && (
        <div className="theme-colors">
          {THEME_ROLES.map((role) => (
            <div className="theme-color" key={role}>
              <label className="swatch" style={{background: theme[role]}} title={`Pick ${THEME_LABELS[role]}`}>
                <input type="color" aria-label={`Pick ${THEME_LABELS[role]}`} value={theme[role]} disabled={disabled} onChange={(e) => changeHex(role, e.target.value)} />
              </label>
              <label htmlFor={`${idPrefix}-hex-${role}`}>{THEME_LABELS[role]}</label>
              <input id={`${idPrefix}-hex-${role}`} className="hex" aria-label={`${THEME_LABELS[role]} hex`} value={hexes[role]} spellCheck={false} disabled={disabled}
                aria-invalid={!isHex(hexes[role])} onChange={(e) => changeHex(role, e.target.value.trim())}
                onBlur={() => setHexes((old) => ({...old, [role]: theme[role]}))} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
