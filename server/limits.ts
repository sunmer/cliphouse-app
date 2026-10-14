// In-memory fixed-window limits, per instance. Acceptable while Cloud Run runs at most 2 instances.
export type Tier = {perMinute: number; perDay: number};
export const TIERS = {
  anonymous: {perMinute: 60, perDay: 1_000},
  key: {perMinute: 600, perDay: 20_000},
} satisfies Record<string, Tier>;

type Window = {start: number; count: number};
export type Decision = {ok: boolean; limit: number; remaining: number; reset: number; retryAfter: number};

export function createLimiter(now = () => Date.now(), maxKeys = 50_000) {
  const minutes = new Map<string, Window>();
  const days = new Map<string, Window>();
  const hit = (map: Map<string, Window>, key: string, span: number, limit: number, t: number) => {
    let w = map.get(key);
    if (!w || t - w.start >= span) {
      if (!w && map.size >= maxKeys) map.delete(map.keys().next().value!);
      w = {start: t, count: 0};
      map.set(key, w);
    }
    w.count++;
    return {over: w.count > limit, remaining: Math.max(0, limit - w.count), reset: w.start + span};
  };
  return (key: string, tier: Tier): Decision => {
    const t = now();
    const minute = hit(minutes, key, 60_000, tier.perMinute, t);
    const day = hit(days, key, 86_400_000, tier.perDay, t);
    // Report the window that is binding: the daily one once it is exhausted.
    const binding = day.over || (!minute.over && day.remaining < minute.remaining) ? {...day, limit: tier.perDay} : {...minute, limit: tier.perMinute};
    const ok = !minute.over && !day.over;
    return {ok, limit: binding.limit, remaining: binding.remaining, reset: Math.ceil(binding.reset / 1000),
      retryAfter: ok ? 0 : Math.max(1, Math.ceil((binding.reset - t) / 1000))};
  };
}

// Client IP as seen by Cloudflare, else the first proxy hop, else the socket.
export function clientIp(headers: Record<string, string | string[] | undefined>, socket?: string) {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim();
  return one(headers['cf-connecting-ip']) || one(headers['x-forwarded-for'])?.split(',')[0].trim() || socket || 'unknown';
}
