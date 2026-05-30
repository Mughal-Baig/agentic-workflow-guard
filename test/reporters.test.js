import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { renderGithubStepSummary, renderSarif } from '../src/reporters.js';
import { scanWorkflowText } from '../src/scanner.js';

const bin = path.resolve('bin', 'awguard.js');

test('renders SARIF 2.1.0 output for GitHub code scanning', () => {
  const findings = scanWorkflowText(
    `
on: [issue_comment]
jobs:
  triage:
    steps:
      - run: openai --prompt "\${{ github.event.comment.body }}"
`,
    'agent.yml'
  );

  const sarif = JSON.parse(
    renderSarif({
      root: process.cwd(),
      scannedFiles: ['agent.yml'],
      summary: { total: findings.length, highest: 'high', bySeverity: {} },
      findings
    })
  );

  assert.equal(sarif.version, '2.1.0');
  assert.equal(sarif.runs[0].tool.driver.name, 'Agentic Workflow Guard');
  assert.equal(sarif.runs[0].results[0].ruleId, 'AWG001');
  assert.equal(sarif.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri, 'agent.yml');
  assert.ok(sarif.runs[0].results[0].locations[0].physicalLocation.region.startColumn > 1);
  assert.match(sarif.runs[0].results[0].locations[0].physicalLocation.region.snippet.text, /github\.event\.comment\.body/);
  assert.ok(sarif.runs[0].results[0].partialFingerprints.primaryLocationLineHash);
  assert.equal(
    sarif.runs[0].results[0].partialFingerprints.primaryLocationLineHash,
    sarif.runs[0].results[0].partialFingerprints.awguardStableFindingId
  );
  assert.equal(sarif.runs[0].results[0].fingerprints['awguard/v1'], sarif.runs[0].results[0].partialFingerprints.primaryLocationLineHash);
  assert.ok(sarif.runs[0].results[0].properties.baselineState);
  assert.equal(sarif.runs[0].tool.driver.rules[0].helpUri, 'https://github.com/Mughal-Baig/agentic-workflow-guard#rule-reference');
  assert.ok(sarif.runs[0].tool.driver.rules[0].properties.tags.includes('prompt-injection'));
});

test('renders GitHub job summary markdown', () => {
  const findings = scanWorkflowText(
    `
on: [issue_comment]
jobs:
  triage:
    steps:
      - run: openai --prompt "\${{ github.event.comment.body }}"
`,
    'agent.yml'
  );

  const summary = renderGithubStepSummary(
    {
      root: process.cwd(),
      scannedFiles: ['agent.yml'],
      summary: { total: findings.length, highest: 'high', bySeverity: {} },
      findings
    },
    { format: 'github', failOn: 'high', outputFile: 'awguard.sarif' }
  );

  assert.match(summary, /Agentic Workflow Guard/);
  assert.match(summary, /Top Findings/);
  assert.match(summary, /AWG001/);
  assert.match(summary, /awguard\.sarif/);
});

test('CLI writes GitHub step summary when running as an action', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awguard-summary-'));
  const summaryFile = path.join(root, 'summary.md');
  fs.mkdirSync(path.join(root, '.github', 'workflows'), { recursive: true });
  fs.writeFileSync(
    path.join(root, '.github', 'workflows', 'agent.yml'),
    `
on: [issue_comment]
jobs:
  triage:
    steps:
      - run: openai --prompt "\${{ github.event.comment.body }}"
`
  );

  const result = spawnSync(process.execPath, [bin, root, '--fail-on', 'none'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      GITHUB_ACTIONS: 'true',
      GITHUB_ACTION: 'test',
      GITHUB_STEP_SUMMARY: summaryFile
    }
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(fs.readFileSync(summaryFile, 'utf8'), /Top Findings/);
  assert.match(fs.readFileSync(summaryFile, 'utf8'), /AWG001/);
});
