import {Scissors} from 'lucide-react';
import type {ReactNode} from 'react';
import {AccountButton} from './Account';

export function Header({children}: {children?: ReactNode}) {
  return (
    <header className="topbar">
      <a className="logo" href="#/">
        <Scissors size={22} />
        <span className="logo-copy">
          <span>cliphou.se</span>
          <span className="logo-tagline">You ship it. Cliphouse shows it off.</span>
        </span>
      </a>
      <div className="topbar-slot">{children}</div>
      <AccountButton />
    </header>
  );
}
