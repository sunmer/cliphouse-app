# Brand colors in the gallery: spec

Status: built, 2026-10-13. This document replaces the earlier proposal for an identity kit with logos and uploads.

## Goal

A user picks their brand colors once, and the whole gallery previews in those colors. Every video they open starts in the same colors. The kit holds colors only.

## What changed

- **Before:** the brand kit stored brand text (brand, headline, subhead, points, call to action) and one theme. It opened from a header button. The editor applied it by hand with the wand button "Apply brand kit".
- **Now:** the kit stores one 5-color theme and an on/off state. The controls sit in a strip above the gallery. An untouched video opens in the kit colors. The wand button is gone.

## Kit model

- **File:** `src/ui/brandKit.ts`.
- **Shape:** `{enabled: boolean, theme: Theme | null}`.
- **Storage:** `localStorage` key `cliphouse:brandkit:colors`, in this browser only. The old `voodoo:brandkit` key is ignored. Old kits are not migrated, and the user sees no notice.
- **Apply:** `applyKit(props, kit)` replaces only `props.theme`. Text, images, hidden roles, and sound do not change. With the kit off or empty, it returns the props unchanged.
- **Roles:** `ROLES[*].kit` in `src/videos/vocab.ts` stays as it is. Changing that file would publish new versions of every source package.

## Gallery strip

The strip is a full-width band between the header and the results bar (`src/ui/BrandStrip.tsx`). From left to right it holds:

1. **Label:** "Preview in your brand colors".
2. **Original:** turns the kit off. Each card shows its own colors.
3. **Palettes:** the 8 presets from `src/ui/palettes.ts`.
4. **Generate:** replaces the presets with new generated palettes.
5. **Customize:** opens the 5 swatches with hex inputs below the palettes.
6. **Switch:** turns the kit on or off and keeps the chosen colors.

**Rules:**

- Choosing a palette, a swatch color, or a valid hex value turns the kit on.
- Original or the switch turns the kit off.
- While the kit is on, cards show live Remotion frames in the kit colors, and the card palette dots show the kit theme. While it is off, cards show their preview images and videos.
- On narrow screens the palettes scroll sideways on their own row, and Customize opens below them.

## Shared theme controls

`src/ui/ThemeControls.tsx` holds the palette grid and the 5-swatch editor. The editor's Theme panel and the gallery strip both use it, so the two look and behave the same. It takes a theme, a palette list, an `onChange` callback, and `disabled`.

## Editor

- **Opening:** when the kit is on and the video has no local edit, saved draft, share, or agent handoff, the video opens in the kit colors.
- **Untouched videos:** the editor does not store a video in `localStorage` while it equals its opening props. A stored copy that equals the template's own props is not treated as an edit. This lets a kit change reach videos the user only opened.
- **Reset:** restores the template's own preset, not the kit.
- **Kit changes:** an open video does not change when the kit changes elsewhere.

## Analytics

| Event | Param | Values |
|---|---|---|
| `brandkit_theme` | `source` | `preset`, `generated`, `custom` |
| `brandkit_toggle` | `state` | `on`, `off` |

Custom color edits send one event after the user stops changing the color for 800 ms.

## Not in this version

- No contrast guard. A kit can make text hard to read on some templates.
- No per-template opt-out flags. The kit applies to every template.
- No account sync. The kit stays in one browser.

## Later work

- **Logos:** a logo upload and a `logo` slot on templates, with the brand name as the fallback.
- **Brand name:** a kit name that fills the `brand` role.
- **Uploads:** screenshot uploads into template image slots, stored per account.
- **Account sync:** the kit stored with the account so it follows the user.
- **Contrast guard and opt-out flags:** keep text readable, and let templates with fixed looks keep their palette.

## Testing

- **Unit:** `scripts/brandkit.test.ts`, run by `npm run test:agent`. It checks that `applyKit` changes only the theme, and that the result passes `validateProps` for every visible variant with every preset, generated, and custom kit.
- **Browser:** `scripts/smoke.cjs` (Chromium, 1440 and 390 px) and `scripts/smoke-ios.cjs` (WebKit, iPhone). They pick a palette in the strip, check the live card previews and colors, open a video in the kit colors, Reset to the preset, and turn the kit off.
