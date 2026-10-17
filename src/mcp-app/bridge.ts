// Minimal MCP Apps view bridge (io.modelcontextprotocol/ui): JSON-RPC 2.0 over postMessage with the host.
// Written by hand to keep the inlined preview bundle small. See the ext-apps specification.
export const PROTOCOL_VERSION = '2026-01-26';

type Message = {jsonrpc: '2.0'; id?: number | string; method?: string; params?: unknown; result?: unknown; error?: {message?: string}};
export type HostContext = {
  theme?: 'light' | 'dark';
  platform?: 'web' | 'desktop' | 'mobile';
  containerDimensions?: {width?: number; maxWidth?: number; height?: number; maxHeight?: number};
};
export type HostCapabilities = {openLinks?: object; message?: object; serverTools?: object};
export type ToolResult = {structuredContent?: unknown; content?: unknown[]; isError?: boolean};

export function createBridge(target: Window = window.parent) {
  let nextId = 1;
  const pending = new Map<number | string, {resolve: (v: unknown) => void; reject: (e: Error) => void}>();
  const handlers = new Map<string, Set<(params: unknown) => void>>();
  const send = (message: Omit<Message, 'jsonrpc'>) => target.postMessage({jsonrpc: '2.0', ...message}, '*');

  window.addEventListener('message', (event) => {
    if (event.source !== target) return;
    const message = event.data as Message;
    if (!message || message.jsonrpc !== '2.0') return;
    if (message.id !== undefined && !message.method) {
      const waiter = pending.get(message.id);
      if (!waiter) return;
      pending.delete(message.id);
      if (message.error) waiter.reject(new Error(message.error.message || 'Host error'));
      else waiter.resolve(message.result);
      return;
    }
    if (!message.method) return;
    // Requests from the host need a reply; teardown is the only one this view receives.
    if (message.id !== undefined) {
      send({id: message.id, result: {}});
    }
    handlers.get(message.method)?.forEach((handler) => handler(message.params));
  });

  const request = <T>(method: string, params: unknown, timeoutMs = 10_000) => new Promise<T>((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out`)); }, timeoutMs);
    pending.set(id, {resolve: (v) => { clearTimeout(timer); resolve(v as T); }, reject: (e) => { clearTimeout(timer); reject(e); }});
    send({id, method, params});
  });
  const notify = (method: string, params: unknown = {}) => send({method, params});
  const on = (method: string, handler: (params: unknown) => void) => {
    const set = handlers.get(method) ?? new Set();
    set.add(handler);
    handlers.set(method, set);
    return () => set.delete(handler);
  };

  return {
    on, notify, request,
    async connect() {
      const result = await request<{hostContext?: HostContext; hostCapabilities?: HostCapabilities}>('ui/initialize', {
        appInfo: {name: 'cliphouse-previews', version: '1.0.0'},
        appCapabilities: {availableDisplayModes: ['inline', 'fullscreen']},
        protocolVersion: PROTOCOL_VERSION,
      });
      notify('ui/notifications/initialized');
      return result ?? {};
    },
    openLink: (url: string) => request('ui/open-link', {url}),
    message: (text: string) => request('ui/message', {role: 'user', content: [{type: 'text', text}]}),
    size: (width: number, height: number) => notify('ui/notifications/size-changed', {width, height}),
    displayMode: (mode: 'inline' | 'fullscreen') => request('ui/request-display-mode', {mode}),
  };
}
export type Bridge = ReturnType<typeof createBridge>;
