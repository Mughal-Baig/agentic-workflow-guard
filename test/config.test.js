import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { normalizeConfig } from '../src/config.js';
import { scanWorkflowText } from '../src/scanner.js';

const bin = path.resolve('bin', 'awguard.js');

test('normalizes rule severity overrides and disabled rules', () => {
  const config = normalizeConfig({
    rules: {
      AWG004: 'critical',
      AWG010: 'off'
    },
    suppressions: {
      allowedRules: ['AWG001'],
      minimumReasonLength: 20
    }
  });

  assert.deepEqual(config.rules.AWG004, { enabled: true, severity: 'critical' });
  assert.deepEqual(config.rules.AWG010, { enabled: false });
  assert.deepEqual(config.suppressions.allowedRules, ['AWG001']);
  assert.equal(config.suppressions.minimumReasonLength, 20);
});

test('rejects unknown configured rule ids', () => {
  assert.throws(
    () =>
      normalizeConfig({
        rules: {
          AWG999: 'off'
        }
      }),
    /unknown rule id/
  );
});

test('normalizes named presets and explicit overrides', () => {
  const config = normalizeConfig({
    extends: ['strict', 'triage-bot'],
    rules: {
      AWG010: 'off'
    }
  });

  assert.equal(config.rules.AWG001.severity, 'critical');
  assert.equal(config.rules.AWG006.severity, 'critical');
  assert.equal(config.rules.AWG010.enabled, false);
  assert.equal(config.suppressions.minimumReasonLength, 30);
});

test('normalizes policy allowlists', () => {
  const config = normalizeConfig({
    policy: {
      approvedFiles: ['AGENTS.md', '.github/workflows/*'],
      approvedMcpServers: ['github'],
      approvedMcpPackages: ['@modelcontextprotocol/server-github@1.2.3'],
      approvedMcpCommands: ['npx']
    }
  });

  assert.deepEqual(config.policy.approvedFiles, ['AGENTS.md', '.github/workflows/*']);
  assert.deepEqual(config.policy.approvedMcpServers, ['github']);
  assert.deepEqual(config.policy.approvedMcpPackages, ['@modelcontextprotocol/server-github@1.2.3']);
  assert.deepEqual(config.policy.approvedMcpCommands, ['npx']);
});

test('normalizes scan include and exclude globs', () => {
  const config = normalizeConfig({
    scan: {
      include: ['.github/workflows/*', 'AGENTS.md'],
      exclude: ['node_modules/*']
    }
  });

  assert.deepEqual(config.scan.include, ['.github/workflows/*', 'AGENTS.md']);
  assert.deepEqual(config.scan.exclude, ['node_modules/*']);
});

test('rejects malformed policy allowlists', () => {
  assert.throws(
    () =>
      normalizeConfig({
        policy: {
          approvedFiles: 'AGENTS.md'
        }
      }),
    /policy.approvedFiles must be an array/
  );
});

test('rejects malformed scan globs', () => {
  assert.throws(
    () =>
      normalizeConfig({
        scan: {
          include: '.github/workflows/*'
        }
      }),
    /scan.include must be an array/
  );
});

test('scanner applies disabled rules and severity overrides', () => {
  const workflow = `
on: [workflow_dispatch]
permissions: write-all
jobs:
  release:
    steps:
      - run: codex --approval-mode suggest --prompt-file prompt.txt
`;

  const disabled = scanWorkflowText(workflow, 'release.yml', process.cwd(), {
    rules: {
      AWG004: { enabled: false }
    },
    suppressions: { allow: true, allowedRules: [], minimumReasonLength: 10 }
  });
  assert.equal(disabled.some((finding) => finding.ruleId === 'AWG004'), false);

  const elevated = scanWorkflowText(workflow, 'release.yml', process.cwd(), {
    rules: {
      AWG004: { enabled: true, severity: 'critical' }
    },
    suppressions: { allow: true, allowedRules: [], minimumReasonLength: 10 }
  });
  const finding = elevated.find((candidate) => candidate.ruleId === 'AWG004');
  assert.equal(finding.severity, 'critical');
});

test('scanner enforces configured suppression allow list', () => {
  const workflow = `
on: [workflow_dispatch]
permissions: write-all # awguard-disable-line AWG004 -- Release job intentionally writes tags after manual approval.
jobs:
  release:
    steps:
      - run: codex --approval-mode suggest --prompt-file prompt.txt
`;

  const findings = scanWorkflowText(workflow, 'release.yml', process.cwd(), {
    rules: {},
    suppressions: { allow: true, allowedRules: ['AWG001'], minimumReasonLength: 10 }
  });
  const rules = findings.map((finding) => finding.ruleId);

  assert.ok(rules.includes('AWG011'));
  assert.ok(rules.includes('AWG004'));
});

test('CLI auto-discovers awguard.config.json from the scan root', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awguard-config-'));
  const workflowDir = path.join(root, '.github', 'workflows');
  fs.mkdirSync(workflowDir, { recursive: true });
  fs.writeFileSync(
    path.join(root, 'awguard.config.json'),
    JSON.stringify(
      {
        rules: {
          AWG010: 'off'
        }
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(workflowDir, 'agent.yml'),
    `
on: [workflow_dispatch]
permissions:
  contents: read
jobs:
  scan:
    steps:
      - uses: third-party/agent-action@v1
      - run: openai --prompt-file prompt.txt
`
  );

  const result = spawnSync(process.execPath, [bin, root, '--format', 'text', '--fail-on', 'low'], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /No findings/);
});
