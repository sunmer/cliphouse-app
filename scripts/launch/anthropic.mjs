// Minimal Anthropic Messages API client for build scripts. It streams, so long high-effort answers never
// hit a read timeout. Reads ANTHROPIC_API_KEY from the environment or .env and never prints it.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
export function loadEnv() {
  const file = path.join(root, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

// USD per million tokens on the Anthropic API. Cache reads cost 0.1x input, 5-minute cache writes 1.25x.
const PRICES = {opus: [5, 25], sonnet: [3, 15], haiku: [1, 5]};
export function costOf(model, u) {
  const [i, o] = PRICES[Object.keys(PRICES).find((k) => model.includes(k)) ?? 'opus'];
  return ((u.input_tokens ?? 0) * i + (u.cache_read_input_tokens ?? 0) * i * 0.1
    + (u.cache_creation_input_tokens ?? 0) * i * 1.25 + (u.output_tokens ?? 0) * o) / 1e6;
}

/** One streamed Messages call. Returns the text, usage, and stop reason. Retries overload and rate limits. */
export async function message({model, effort, system, messages, maxTokens = 64000}) {
  loadEnv();
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set.');
  const body = JSON.stringify({model, max_tokens: maxTokens, stream: true, thinking: {type: 'adaptive'},
    output_config: {effort}, system, messages});
  // Network drops are common on this machine: retry for up to about 15 minutes before giving up.
  const MAX = 16;
  const wait = (attempt) => new Promise((r) => setTimeout(r, Math.min(60_000, 10_000 * attempt)));
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {method: 'POST', body,
        headers: {'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'}});
      if (!res.ok) {
        const text = (await res.text()).slice(0, 600);
        if ([429, 500, 502, 503, 529].includes(res.status) && attempt < MAX) { await wait(attempt); continue; }
        throw new Error(`Anthropic API ${res.status}: ${text}`);
      }
      let text = '';
      const usage = {};
      let stop = null;
      let buf = '';
      const decoder = new TextDecoder();
      for await (const chunk of res.body) {
        buf += decoder.decode(chunk, {stream: true});
        let at;
        while ((at = buf.indexOf('\n\n')) >= 0) {
          const event = buf.slice(0, at);
          buf = buf.slice(at + 2);
          const data = event.split('\n').find((l) => l.startsWith('data: '));
          if (!data) continue;
          const e = JSON.parse(data.slice(6));
          if (e.type === 'message_start') Object.assign(usage, e.message.usage);
          else if (e.type === 'content_block_delta' && e.delta.type === 'text_delta') text += e.delta.text;
          else if (e.type === 'message_delta') { Object.assign(usage, e.usage); stop = e.delta.stop_reason; }
          else if (e.type === 'error') throw Object.assign(new Error(`Anthropic stream error: ${JSON.stringify(e.error)}`), {retry: e.error?.type === 'overloaded_error'});
        }
      }
      return {text, usage, stop};
    } catch (e) {
      // Dropped connections, DNS failures, and overloaded streams are retried; API errors above are final.
      const text = `${e.message} ${e.cause?.code ?? ''} ${e.cause?.message ?? ''}`;
      if (attempt < MAX && (e.retry || /fetch failed|terminated|ECONNRESET|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ENETUNREACH|socket|other side closed/i.test(text))) {
        console.error(`network retry ${attempt}: ${text.trim().slice(0, 120)}`);
        await wait(attempt);
        continue;
      }
      throw e;
    }
  }
}
