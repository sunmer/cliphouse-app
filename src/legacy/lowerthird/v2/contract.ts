import {z} from 'zod';
import type {Role, ThemeRole} from './vocab.ts';
import {ROLES, THEME_ROLES, roleHint, rolePattern} from './vocab.ts';

export * from './vocab.ts';

// The editing contract every generated composition must follow:
// all copy comes from `texts` (using shared roles), all color from `theme`.
export function textsSchema<R extends Role>(roles: readonly R[]) {
  // Structured roles use a regex, so the rule also appears in the agent JSON Schema.
  const field = (r: R) => {
    const base = z.string().min(1, 'Required').max(ROLES[r].max);
    const pattern = rolePattern(r);
    return (pattern ? base.regex(pattern, roleHint(r)) : base).meta({role: r});
  };
  const shape = Object.fromEntries(roles.map((r) => [r, field(r)]));
  return z.object(shape) as unknown as z.ZodObject<{[K in R]: z.ZodString}>;
}

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex color');

export const themeSchema = z.object(
  Object.fromEntries(THEME_ROLES.map((r) => [r, hex.meta({role: r})])) as {[K in ThemeRole]: typeof hex},
);

export type VideoSchema = z.ZodObject<{
  texts: z.ZodObject<Record<string, z.ZodString>>;
  theme: typeof themeSchema;
}>;

export type TextField = {key: Role; label: string; max: number};

// Derive editor fields from the schema so new compositions need no UI code.
export function describeSchema(schema: VideoSchema): TextField[] {
  return Object.keys(schema.shape.texts.shape).map((key) => {
    const role = key as Role;
    return {key: role, label: ROLES[role].label, max: ROLES[role].max};
  });
}
