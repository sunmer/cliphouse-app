import {ArrowUpRight, Scissors} from 'lucide-react';
import React, {type ReactNode} from 'react';

export function ArticleLayout({base, children, current = 'benchmark'}: {base: string; children: ReactNode; current?: 'benchmark' | 'gta6'}) {
  return <div className="article-site">
    <a className="article-skip" href="#article">Skip to content</a>
    <header className="article-header">
      <a className="article-brand" href={base}><Scissors size={22} aria-hidden="true" />cliphou.se</a>
      <nav aria-label="Main navigation">
        <a href={`${base}benchmark/`} aria-current={current === 'benchmark' ? 'page' : undefined}>Benchmark</a>
        <a href={`${base}benchmark/gta6/`} aria-current={current === 'gta6' ? 'page' : undefined}>GTA6 benchmark</a>
        <a href={base}>Templates <ArrowUpRight size={14} aria-hidden="true" /></a>
      </nav>
    </header>
    <main id="article" className="article-main">{children}</main>
    <footer className="article-footer">
      <a className="article-brand" href={base}><Scissors size={18} aria-hidden="true" />cliphou.se</a>
      <nav aria-label="Footer">
        <a href={`${base}about/`}>About</a>
        <a href={`${base}benchmark/`}>Benchmark</a>
        <a href={`${base}license/`}>License</a>
        <a href={`${base}#/privacy`}>Privacy</a>
      </nav>
    </footer>
  </div>;
}
