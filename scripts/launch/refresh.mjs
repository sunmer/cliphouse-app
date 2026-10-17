// Developer refresh briefs (2026-10-18). Each one separates what the video must show from one chosen visual
// world, so the model does not draw the expected UI diagram. Pilot runs use these themes and briefs; the
// catalog keeps the old preset until an id is listed in refresh-approved.json by scripts/launch/publish.mjs.
import fs from 'node:fs';
import path from 'node:path';

export const REFRESH = {
  changelog: {
    summary: 'A 4:5 weekly changelog printed as a release ledger: up to five shipped items are entered, stamped, and annotated in the margin one per beat, then the CTA.',
    information: 'The brand, the headline, the version and week (date), up to five shipped items (each may start with New, Improved, or Fixed), and the CTA. Each item must be read as its own entry.',
    visual: 'A printed release ledger: a ruled paper sheet with a deep left margin. Items are entered like ledger lines, a rubber stamp marks each New, Improved, or Fixed entry, a fold line crosses the sheet, and hand-placed tick marks run down the margin. Paper, ink, and stamps, not a screen.',
    type: 'Fraunces HF (.serif) for the headline and entries; Mono HF (.mono) only for the version, dates, and margin marks.',
    theme: {background: '#f4efe4', surface: '#e6dcc8', foreground: '#1f1a14', accent: '#c8361d', accent2: '#2c5f8a'},
    references: [['src/videos/magazine/Magazine.tsx', 'print layout and editorial rhythm'], ['src/videos/collage/Collage.tsx', 'a different category: physical paper, tape, and stamps']],
  },
  releasenotes: {
    summary: 'A 16:9 release notes video laid out as a technical manual: a running section index advances while up to six notes are set as numbered clauses with margin annotations, then the CTA.',
    information: 'The brand, the release name (headline), the date, up to six release notes, and the CTA (often an install command). Each note must be read in full.',
    visual: 'A technical manual spread: a running index of section numbers down the left edge, a thin rule system, numbered clauses set like a printed specification, small annotation callouts that point from the margin to the active clause, and a page number that advances. Calm and precise, like a reference book, not a terminal.',
    type: 'Inter HF for the notes and headline; Fraunces HF italic (.serif, font-style italic) for annotations only.',
    theme: {background: '#eef1ef', surface: '#d9e1dc', foreground: '#14201b', accent: '#0d6b57', accent2: '#c2410c'},
    references: [['src/videos/swiss/Swiss.tsx', 'grid discipline and modular text blocks'], ['src/videos/credits/Credits.tsx', 'a different category: calm typographic sequencing of many lines']],
  },
  apirelease: {
    summary: 'A 16:9 API release shown as a signal diagram: a request travels along a drawn route through up to four stations, each labeled with a short code line, then the CTA.',
    information: 'The brand, the release name (headline), the version and date, up to four short code lines (a request, a field, a flag, a response), and the CTA. Each code line must be read in full.',
    visual: 'A signal or circuit diagram: one request pulse travels along a drawn line through a chain of stations. Each station lights up and carries one code line as a short mono label. Junctions, branch lines, and a measured response marker. Code appears only as labels on the diagram, never in an editor window.',
    type: 'Archivo HF (.display) for the headline; Mono HF (.mono) for the code labels, version, and date.',
    theme: {background: '#fff8e7', surface: '#ffe7a8', foreground: '#171717', accent: '#e4572e', accent2: '#2364aa'},
    references: [['src/hyperframes/signal/index.html', 'a drawn signal line carrying the film'], ['src/videos/doodle/Doodle.tsx', 'a different category: drawn lines and annotation marks']],
  },
  migration: {
    summary: 'A 16:9 upgrade walkthrough drawn as a transit map: the upgrade route runs from the old version to the new one through up to four numbered stops, then the CTA.',
    information: 'The brand, the upgrade (headline), up to four numbered upgrade steps, and the CTA. Each step must be read in full, in order.',
    visual: 'A transit or route map: one colored line runs from an old-version terminus to a new-version terminus, bending at clean 45 and 90 degree angles. Each upgrade step is a station with a round stop marker and a label. A train or route marker travels the line as each stop is reached, and the destination becomes the CTA.',
    type: 'Archivo HF (.display) for the headline and terminus names; Inter HF for station labels.',
    theme: {background: '#f7f4fb', surface: '#e5def2', foreground: '#1a1530', accent: '#d6336c', accent2: '#0b7285'},
    references: [['src/videos/timeline/Timeline.tsx', 'a route line drawn across ordered stops'], ['src/videos/travelintro/Travelintro.tsx', 'a different category: a route path as the hero']],
  },
};

const approvedFile = path.join(import.meta.dirname, 'refresh-approved.json');
export const approvedRefresh = () => (fs.existsSync(approvedFile) ? JSON.parse(fs.readFileSync(approvedFile, 'utf8')) : []);
export const approveRefresh = (ids) => fs.writeFileSync(approvedFile, `${JSON.stringify([...new Set([...approvedRefresh(), ...ids])].sort(), null, 2)}\n`);
// Pilot runs set LAUNCH_REFRESH=1 so generation, checks, and previews use the refresh brief before approval.
export const refreshOf = (id) => (REFRESH[id] && (process.env.LAUNCH_REFRESH === '1' || approvedRefresh().includes(id)) ? REFRESH[id] : null);
