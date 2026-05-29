import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { scanWorkflowText, scanWorkflows } from '../src/scanner.js';

test('detects untrusted issue comments flowing into privileged agent workflow', () => {
  const workflow = `
name: Unsafe AI triage
on:
  issue_comment:
permissions: write-all
jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
        run: |
          codex --dangerously-skip-permissions --prompt "\${{ github.event.comment.body }}"
`;

  const rules = scanWorkflowText(workflow).map((finding) => finding.ruleId);

  assert.ok(rules.includes('AWG001'));
  assert.ok(rules.includes('AWG002'));
  assert.ok(rules.includes('AWG004'));
  assert.ok(rules.includes('AWG005'));
  assert.ok(rules.includes('AWG006'));
});

test('detects pull_request_target checkout of pull request head code', () => {
  const workflow = `
on:
  pull_request_target:
jobs:
  test:
    steps:
      - uses: actions/checkout@v4
        with:
          ref: \${{ github.event.pull_request.head.sha }}
`;

  const findings = scanWorkflowText(workflow);

  assert.equal(findings.some((finding) => finding.ruleId === 'AWG003'), true);
});

test('keeps ordinary non-agent workflows quiet', () => {
  const workflow = `
name: Tests
on:
  pull_request:
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test
`;

  assert.deepEqual(scanWorkflowText(workflow), []);
});

test('discovers workflow files under .github/workflows', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awguard-'));
  const workflowDir = path.join(root, '.github', 'workflows');
  fs.mkdirSync(workflowDir, { recursive: true });
  fs.writeFileSync(
    path.join(workflowDir, 'agent.yml'),
    `
on: [issue_comment]
jobs:
  triage:
    steps:
      - run: claude --prompt "\${{ github.event.comment.body }}"
`
  );

  const result = scanWorkflows({ root });

  assert.equal(result.scannedFiles.length, 1);
  assert.ok(result.findings.some((finding) => finding.ruleId === 'AWG001'));
});

test('reports single workflow file paths relative to the file directory', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awguard-file-'));
  const workflowFile = path.join(root, 'agent.yml');
  fs.writeFileSync(
    workflowFile,
    `
on: [issue_comment]
jobs:
  triage:
    steps:
      - run: openai --prompt "\${{ github.event.comment.body }}"
`
  );

  const result = scanWorkflows({ root: workflowFile });

  assert.equal(result.findings[0].file, 'agent.yml');
});
