import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildPolicyWizard } from '../src/policy-wizard.js';
import { scanWorkflows } from '../src/scanner.js';

const bin = path.resolve('bin', 'awguard.js');

test('builds a starter policy from scanned files and MCP configs', () => {
  const root = createPolicyFixture();
  const result = scanWorkflows({ root });
  const wizard = buildPolicyWizard(result);

  assert.ok(wizard.config.policy.approvedFiles.includes('.github/workflows/agent.yml'));
  assert.ok(wizard.config.policy.approvedFiles.includes('.mcp.json'));
  assert.ok(wizard.config.policy.approvedMcpServers.includes('github'));
  assert.ok(wizard.config.policy.approvedMcpCommands.includes('npx'));
  assert.ok(wizard.config.policy.approvedMcpPackages.includes('@modelcontextprotocol/server-github@1.2.3'));
  assert.ok(wizard.config.policy.approvedMcpPackageScopes.includes('@modelcontextprotocol/'));
});

test('CLI policy-wizard dry-run prints starter config and preserves existing config', () => {
  const root = createPolicyFixture();
  const configFile = path.join(root, 'awguard.config.json');
  fs.writeFileSync(
    configFile,
    JSON.stringify(
      {
        extends: ['strict'],
        rules: {
          AWG010: 'off'
        },
        policy: {
          approvedFiles: ['README.md'],
          approvedMcpServers: [],
          approvedMcpPackages: [],
          approvedMcpPackageScopes: [],
          approvedMcpCommands: []
        }
      },
      null,
      2
    )
  );

  const result = spawnSync(process.execPath, [bin, 'policy-wizard', root, '--config', configFile, '--dry-run'], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /AWGuard Policy Wizard/);
  assert.match(result.stdout, /"AWG010": "off"/);
  assert.match(result.stdout, /"README.md"/);
  assert.match(result.stdout, /"@modelcontextprotocol\/server-github@1.2.3"/);
});

test('CLI policy-wizard writes JSON when output is explicit', () => {
  const root = createPolicyFixture();
  const output = path.join(root, 'generated.config.json');

  const result = spawnSync(process.execPath, [bin, 'policy-wizard', root, '--format', 'json', '--output', output], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  const generated = JSON.parse(fs.readFileSync(output, 'utf8'));
  assert.deepEqual(generated.extends, ['strict']);
  assert.ok(generated.policy.approvedFiles.includes('.github/workflows/agent.yml'));
});

function createPolicyFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awguard-policy-wizard-'));
  fs.mkdirSync(path.join(root, '.github', 'workflows'), { recursive: true });
  fs.writeFileSync(
    path.join(root, '.github', 'workflows', 'agent.yml'),
    `
on: [workflow_dispatch]
permissions:
  contents: read
jobs:
  scan:
    steps:
      - run: codex --prompt-file prompt.txt
`
  );
  fs.writeFileSync(
    path.join(root, '.mcp.json'),
    JSON.stringify(
      {
        mcpServers: {
          github: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-github@1.2.3']
          }
        }
      },
      null,
      2
    )
  );
  return root;
}
