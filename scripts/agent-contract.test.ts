import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {test} from 'node:test';
import {AGENT_CONTRACT_VERSION, GOAL_IDS} from '../src/agent/goals.ts';
import {MOMENT_IDS} from '../src/agent/moments.ts';
import {MCP_TOOLS} from '../server/discovery.ts';

const root = path.resolve(import.meta.dirname, '..');
const skillRoot = path.resolve(root, process.env.CLIPHOUSE_SKILL_DIR || '../cliphouse-skills');
const skillFile = path.join(skillRoot, 'skills/cliphouse/SKILL.md');
const helperFile = path.join(skillRoot, 'skills/cliphouse/scripts/cliphouse.mjs');
const required = process.env.CI === 'true' || process.env.REQUIRE_SKILL_CONTRACT === '1';

const objectLiteral = (source: string, name: string) => {
  const match = new RegExp(`const ${name}(?:: [^=]+)? = (\\{[\\s\\S]*?\\n\\});`).exec(source);
  assert.ok(match, `${name} table is missing`);
  return Function(`return (${match[1]})`)() as unknown;
};

test('the coding-agent skill matches the deployed agent contract', {skip: !required && !fs.existsSync(skillFile)}, () => {
  const skill = fs.readFileSync(skillFile, 'utf8');
  const helper = fs.readFileSync(helperFile, 'utf8');
  const version = AGENT_CONTRACT_VERSION.replace(/\./g, '\\.');
  assert.match(helper, new RegExp(`CONTRACT_VERSION = '${version}'`), 'update the helper contract version');
  assert.match(skill, new RegExp(`Contract version: \`${version}\``), 'update the skill contract version');
  for (const goal of GOAL_IDS) {
    assert.ok(skill.includes(`\`${goal}\``), `SKILL.md is missing goal ${goal}`);
    assert.ok(helper.includes(`'${goal}'`), `cliphouse.mjs is missing goal ${goal}`);
  }
  for (const moment of MOMENT_IDS) {
    assert.ok(skill.includes(`\`${moment}\``), `SKILL.md is missing moment ${moment}`);
    assert.ok(helper.includes(`'${moment}'`), `cliphouse.mjs is missing moment ${moment}`);
  }
  assert.match(helper, /--moment/, 'cliphouse.mjs must pass --moment to search_templates');
  for (const tool of MCP_TOOLS) assert.ok(helper.includes(`'${tool}'`), `cliphouse.mjs does not use ${tool}`);
  const server = fs.readFileSync(path.join(root, 'server/mcp.ts'), 'utf8');
  assert.deepEqual(objectLiteral(helper, 'SYNONYMS'), objectLiteral(server, 'SYNONYMS'), 'search synonym tables differ');
});
