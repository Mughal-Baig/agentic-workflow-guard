import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const bin = path.resolve('bin', 'awguard.js');

test('CLI autofix applies narrow workflow hardening edits', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awguard-autofix-'));
  const workflowDir = path.join(root, '.github', 'workflows');
  const workflowFile = path.join(workflowDir, 'agent.yml');
  fs.mkdirSync(workflowDir, { recursive: true });
  fs.writeFileSync(
    workflowFile,
    `on: [pull_request]
permissions: write-all
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - run: codex --prompt "\${{ github.event.pull_request.title }}"
`
  );

  const result = spawnSync(process.execPath, [bin, root, '--fix'], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Autofix Applied/);
  const fixed = fs.readFileSync(workflowFile, 'utf8');
  assert.match(fixed, /permissions:\n  contents: read/);
  assert.match(fixed, /with:\n          persist-credentials: false/);
});

test('fix dry run includes available autofix plan without editing files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awguard-autofix-plan-'));
  const workflowDir = path.join(root, '.github', 'workflows');
  const workflowFile = path.join(workflowDir, 'agent.yml');
  fs.mkdirSync(workflowDir, { recursive: true });
  fs.writeFileSync(
    workflowFile,
    `on: [workflow_dispatch]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - run: codex --prompt-file prompt.txt
`
  );

  const before = fs.readFileSync(workflowFile, 'utf8');
  const result = spawnSync(process.execPath, [bin, root, '--fix-dry-run'], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Autofix plan/);
  assert.equal(fs.readFileSync(workflowFile, 'utf8'), before);
});
