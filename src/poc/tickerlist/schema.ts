import {z} from 'zod';
import {textsSchema, themeSchema} from '../../videos/contract.ts';
import type {Role, VideoProps} from '../../videos/vocab.ts';
import {storedListErrors, type ListGroup} from '../lists.ts';
import {tickerList} from './meta.ts';

/** Texts, theme, and the roles removed from list groups. Every list rule comes from the shared contract. */
export function listSchema<R extends Role>(roles: readonly R[], lists: ListGroup[], extra: z.ZodRawShape = {}) {
  const removable = lists.flatMap((g) => g.storage.kind === 'roles' ? g.storage.roles : []) as Role[];
  const hidden = z.array(removable.length ? z.enum(removable as [Role, ...Role[]]) : z.never())
    .refine((list) => new Set(list).size === list.length, 'Each removed role appears once');
  return z.object({texts: textsSchema(roles), theme: themeSchema, hidden, ...extra}).strict().superRefine((props, ctx) => {
    for (const g of lists) for (const message of storedListErrors(g, props as unknown as VideoProps)) ctx.addIssue({code: 'custom', message, path: ['hidden']});
  });
}

export const tickerListSchema = listSchema(['brand', 'headline', 'point1', 'point2', 'point3', 'cta'] as const, [tickerList]);
export type TickerListProps = z.infer<typeof tickerListSchema>;
