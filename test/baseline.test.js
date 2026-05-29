import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { applyBaseline, createBaseline } from '../src/baseline.js';
import { scanWorkflowText } from '../src/scanner.js';

const bin = path.resolve('bin', 'awguard.js');

test('applies a baseline to matching findings', () => {
  const workflow = `
on: [issue_comment]
jobs:
  triage:
    steps:
      - run: openai --prompt "\${{ github.event.comment.body }}"
`;

  const result = {
    scannedFiles: ['agent.yml'],
    summary: { total: 0, highest: 'none', bySeverity: {} },
    findings: scanWorkflowText(workflow, 'agent.yml')
  };
  const baseline = createBaseline(result);
  const withBaseline = applyBaseline(result, baseline);

  assert.equal(withBaseline.summary.baseline.new, 0);
  assert.equal(withBaseline.summary.baseline.known, result.findings.length);
  assert.equal(withBaseline.findings.every((finding) => finding.baselineState === 'known'), true);
});

test('CLI baseline suppresses known findings but fails on new ones', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awguard-baseline-'));
  const workflowFile = path.join(root, 'agent.yml');
  const baselineFile = path.join(root, 'awguard.baseline.json');

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

  const write = spawnSync(process.execPath, [bin, workflowFile, '--write-baseline', baselineFile, '--fail-on', 'none'], {
    encoding: 'utf8'
  });
  assert.equal(write.status, 0, write.stderr);
  assert.equal(fs.existsSync(baselineFile), true);

  const known = spawnSync(process.execPath, [bin, workflowFile, '--baseline', baselineFile, '--fail-on', 'high'], {
    encoding: 'utf8'
  });
  assert.equal(known.status, 0, known.stderr);
  assert.match(known.stdout, /Baseline: 0 new, \d+ known/);

  fs.writeFileSync(
    workflowFile,
    `
on: [issue_comment]
permissions: write-all
jobs:
  triage:
    steps:
      - run: openai --prompt "\${{ github.event.comment.body }}"
`
  );

  const newer = spawnSync(process.execPath, [bin, workflowFile, '--baseline', baselineFile, '--fail-on', 'high'], {
    encoding: 'utf8'
  });
  assert.equal(newer.status, 1);
  assert.match(newer.stdout, /Baseline: \d+ new, \d+ known/);
});
