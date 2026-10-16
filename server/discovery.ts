import server from '../server.json' with {type: 'json'};
import {AGENT_CONTRACT_VERSION, MARKETING_GOALS} from '../src/agent/goals.ts';

// Public key that proves control of cliphou.se to the MCP Registry (HTTP domain authentication).
// The private key is kept outside the repository. Rotating it means changing this value and logging in again.
export const REGISTRY_AUTH = 'v=MCPv1; k=ed25519; p=DrY6bavQQXK5e5WYZmT+BeTf65mVvktF5SCQVT09YKo=';

export const MCP_VERSION = server.version;
export const MCP_TOOLS = ['search_templates', 'get_template_spec', 'build_edit_link', 'render_preview', 'render_previews', 'upload_logo'] as const;
export const agentContract = () => ({
  version: AGENT_CONTRACT_VERSION,
  mcpVersion: MCP_VERSION,
  tools: MCP_TOOLS,
  goals: MARKETING_GOALS.map(({id, label}) => ({id, label})),
});

// Discovery document for clients and directories that look for /.well-known/mcp.json.
export function discovery(origin: string) {
  return {
    name: server.name,
    title: server.title,
    description: server.description,
    version: server.version,
    websiteUrl: server.websiteUrl,
    registry: `https://registry.modelcontextprotocol.io/v0.1/servers?search=${encodeURIComponent(server.name)}`,
    remotes: server.remotes,
    tools: MCP_TOOLS,
    agentContract: agentContract(),
    authentication: {
      required: false,
      optional: {type: 'bearer', format: 'chk_...', obtain: `${origin}/ (Account, MCP API keys)`},
    },
    rateLimits: {
      anonymous: {perMinute: 60, perDay: 1000, keyedBy: 'client IP'},
      apiKey: {perMinute: 600, perDay: 20000},
      exceeded: 'HTTP 429 with Retry-After and RateLimit-* headers',
    },
    documentation: `${origin}/llms.txt`,
  };
}
