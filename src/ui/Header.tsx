import {Bot, Scissors} from 'lucide-react';
import type {ReactNode} from 'react';
import {AccountButton} from './Account';

export function Header({children}: {children?: ReactNode}) {
  return (
    <header className="topbar">
      <a className="logo" href="#/">
        <Scissors size={22} />
        <span className="logo-copy">
          <span>cliphou.se</span>
          <span className="logo-tagline">Instant motion graphics for your videos</span>
        </span>
      </a>
      <div className="topbar-slot">{children}</div>
      <a className="agents-link" href={`${import.meta.env.BASE_URL}agents/`} title="Use cliphou.se from your coding agent"><Bot size={18} /><span>For agents</span></a>
      <AccountButton />
    </header>
  );
}
