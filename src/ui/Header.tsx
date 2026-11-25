import {ArrowRight, Scissors} from 'lucide-react';
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
      <div className="topbar-slot">
        {children}
        <a className="header-pill" href={`${import.meta.env.BASE_URL}benchmark/`}>
          <span>New: MiniMax M3.1 benchmarked</span>
          <ArrowRight size={13} aria-hidden="true" />
        </a>
      </div>
      <AccountButton />
    </header>
  );
}
