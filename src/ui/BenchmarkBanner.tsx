import {ArrowRight, CircleX} from 'lucide-react';
import {useState} from 'react';

// Change this key when a new banner should appear for people who closed this one.
const DISMISSED_KEY = 'cliphouse:banner:benchmark-muse-spark-open:dismissed';

function wasDismissed() {
  try { return localStorage.getItem(DISMISSED_KEY) === '1'; } catch { return false; }
}

export function BenchmarkBanner() {
  const [hidden, setHidden] = useState(wasDismissed);
  if (hidden) return null;
  function dismiss() {
    try { localStorage.setItem(DISMISSED_KEY, '1'); } catch {}
    setHidden(true);
  }
  return (
    <aside className="benchmark-banner" aria-label="Benchmark announcement">
      <a className="benchmark-banner-link" href={`${import.meta.env.BASE_URL}benchmark/`}>
        <span><strong>New: Meta Muse Spark Open benchmarked.</strong><span className="benchmark-banner-detail"> See which AI model makes the best videos, with the same briefs and real results.</span></span>
        <span className="benchmark-banner-action">Compare now <ArrowRight size={15} strokeWidth={2.5} aria-hidden="true" /></span>
      </a>
      <button className="benchmark-banner-close" type="button" aria-label="Close benchmark announcement" title="Close" onClick={dismiss}>
        <CircleX size={24} strokeWidth={2.2} aria-hidden="true" />
      </button>
    </aside>
  );
}
