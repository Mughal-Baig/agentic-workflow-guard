import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { applyBaseline, createBaseline, pruneBaseline, reviewBaseline } from '../src/baseline.js';
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

  const write = spawnSync(
    process.execPath,
    [bin, workflowFile, '--write-baseline', baselineFile, '--format', 'text', '--fail-on', 'none'],
    {
      encoding: 'utf8'
    }
  );
  assert.equal(write.status, 0, write.stderr);
  assert.equal(fs.existsSync(baselineFile), true);

  const known = spawnSync(
    process.execPath,
    [bin, workflowFile, '--baseline', baselineFile, '--format', 'text', '--fail-on', 'high'],
    {
      encoding: 'utf8'
    }
  );
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

  const newer = spawnSync(
    process.execPath,
    [bin, workflowFile, '--baseline', baselineFile, '--format', 'text', '--fail-on', 'high'],
    {
      encoding: 'utf8'
    }
  );
  assert.equal(newer.status, 1);
  assert.match(newer.stdout, /Baseline: \d+ new, \d+ known/);
});

test('reviews and prunes stale baseline entries', () => {
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
  const fixedResult = {
    ...result,
    findings: []
  };

  const review = reviewBaseline(fixedResult, baseline);
  const pruned = pruneBaseline(baseline, review);

  assert.equal(review.summary.resolved, baseline.findings.length);
  assert.equal(review.summary.pruneRecommended, true);
  assert.deepEqual(pruned.findings, []);
});

test('CLI baseline-review reports stale entries and only prunes with explicit flag', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awguard-baseline-review-'));
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

  fs.writeFileSync(
    workflowFile,
    `
on: [workflow_dispatch]
jobs:
  triage:
    steps:
      - run: echo ok
`
  );

  const review = spawnSync(process.execPath, [bin, 'baseline-review', workflowFile, '--baseline', baselineFile], {
    encoding: 'utf8'
  });
  assert.equal(review.status, 0, review.stderr);
  assert.match(review.stdout, /Resolved baseline entries: \d+/);
  assert.ok(JSON.parse(fs.readFileSync(baselineFile, 'utf8')).findings.length > 0);

  const prune = spawnSync(process.execPath, [bin, 'baseline-review', workflowFile, '--baseline', baselineFile, '--prune'], {
    encoding: 'utf8'
  });
  assert.equal(prune.status, 0, prune.stderr);
  assert.equal(JSON.parse(fs.readFileSync(baselineFile, 'utf8')).findings.length, 0);
});
