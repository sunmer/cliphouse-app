import {z} from 'zod';

// Brand logos. An uploaded image is rasterized once to a PNG and stored under its SHA-256, so props carry
// only that id, the aspect ratio, and the tint mode. Plain data and zod, so Node scripts can read it.
export const LOGO_ID = /^[a-f0-9]{64}$/;
export const LOGO_MAX_SIDE = 1024;
export const LOGO_MIN_RATIO = 0.2;
export const LOGO_MAX_RATIO = 8;
/** Largest accepted upload, before rasterizing. */
export const LOGO_MAX_BYTES = 1_000_000;
export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] as const;

export const logoSchema = z.object({
  id: z.string().regex(LOGO_ID, 'Use a logo id from upload_logo'),
  ratio: z.number().min(LOGO_MIN_RATIO).max(LOGO_MAX_RATIO),
  // true draws the logo in the template's text color, so it stays readable on every theme.
  mono: z.boolean(),
}).strict().meta({kind: 'logo'});

export type Logo = z.infer<typeof logoSchema>;
export const supportsLogo = (schema: unknown) => !!(schema as {shape?: {logo?: unknown}}).shape?.logo;
export const logoOf = (props: unknown): Logo | undefined => (props as {logo?: Logo}).logo;
export const logoPath = (id: string) => `/l/${id}.png`;
