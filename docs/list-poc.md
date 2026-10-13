# List editing POC (gates 1 and 2)

Hidden editor entries. They are not in the catalog manifest, so the gallery, SEO pages, source packages, and `versions.json` do not change.

| Link | What it is |
| --- | --- |
| `#/v/ticker-flashsale` | The original Ticker, unchanged (reference) |
| `#/v/poc-ticker-list` | Gate 1: the original Ticker design with a one-to-three item board list |
| `#/v/poc-ticker-beat` | Gate 2: Ticker Beat, the directed candidate with the split-flap sound preset |

Run `sh scripts/poc/serve-public.sh` for a public URL. Tests: `node --import tsx --test scripts/poc/lists.test.ts` and `node scripts/poc/smoke.cjs` (needs the dev server on port 5190).

## Contract

- `src/poc/lists.ts` holds the contract: a list group declares its storage (`roles` or newline `packed`), `min`, `max` (capacity from the authored default), and `itemMax`. It lives outside `src/videos`, so no source package hash changes.
- Tapping any member opens the full list, one item per line. Return adds a line. The check button or Cmd/Ctrl+Return saves the list as one undo step. Escape cancels. Lines are trimmed and blank lines ignored. Empty, over-capacity, and overlong lists cannot be saved; nothing is truncated.
- Separate roles: removed items are the last roles, listed in `hidden`, and keep their text, so the restore button brings them back within capacity.
- The brand kit does not apply to POC entries, so it cannot overwrite a list edit.

## Ticker Beat timing

`src/poc/tickerbeat/timing.ts` is the one timing table, read by the composition and the synthesizer. 8 s at 120 BPM: 2 s intro, 4 s list, 2 s CTA. Items reveal at 2, 3, 4 s (three), 2, 4 s (two), or 2 s (one). The sound plan depends on the item count only, so wording never changes the music, and the editor drops the old mix until the new one is ready.

## Not done here

Gate 3 (Hiring, Event Countdown, Agenda fixtures) and gate 4 (local MP4 export). Listening and visual approval of Ticker Beat is the user's.
