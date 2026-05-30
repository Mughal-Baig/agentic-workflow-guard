import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const bin = path.resolve('bin', 'awguard.js');
const unsafeLab = path.resolve('examples', 'lab', 'unsafe');
const fixedLab = path.resolve('examples', 'lab', 'fixed');

test('unsafe and fixed labs match golden report snapshots', () => {
  const unsafe = runJson([unsafeLab, '--format', 'json', '--fail-on', 'none']);
  const fixed = runJson([fixedLab, '--format', 'json', '--fail-on', 'none']);

  assert.deepEqual(
    {
      unsafeSummary: unsafe.summary,
      unsafeFiles: unsafe.scannedFiles,
      unsafeFindings: findingSnapshot(unsafe.findings),
      fixedSummary: fixed.summary,
      fixedFiles: fixed.scannedFiles
    },
    {
      unsafeSummary: {
        total: 10,
        highest: 'critical',
        bySeverity: { none: 0, low: 0, medium: 0, high: 8, critical: 2 }
      },
      unsafeFiles: ['.github/workflows/ai-triage.yml', '.mcp.json', 'AGENTS.md'],
      unsafeFindings: [
        'AWG001:.github/workflows/ai-triage.yml:16:prompt.isolate-untrusted-text',
        'AWG014:.mcp.json:7:mcp.prompt-secrets',
        'AWG004:.github/workflows/ai-triage.yml:6:permissions.tighten-token',
        'AWG016:.github/workflows/ai-triage.yml:12:checkout.disable-persisted-credentials',
        'AWG005:.github/workflows/ai-triage.yml:14:secrets.split-privileged-workflow',
        'AWG002:.github/workflows/ai-triage.yml:16:shell.quote-github-context',
        'AWG006:.github/workflows/ai-triage.yml:16:agent.require-approval',
        'AWG013:.mcp.json:5:mcp.pin-server',
        'AWG012:AGENTS.md:3:instructions.harden-agent-boundary',
        'AWG012:AGENTS.md:4:instructions.harden-agent-boundary'
      ],
      fixedSummary: {
        total: 0,
        highest: 'none',
        bySeverity: { none: 0, low: 0, medium: 0, high: 0, critical: 0 }
      },
      fixedFiles: ['.github/workflows/ai-triage.yml', '.mcp.json', 'AGENTS.md']
    }
  );
});

test('compare, inventory, and score outputs match golden snapshots', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'awguard-e2e-'));
  const unsafeReport = path.join(tempDir, 'unsafe.json');
  const fixedReport = path.join(tempDir, 'fixed.json');
  fs.writeFileSync(unsafeReport, run([unsafeLab, '--format', 'json', '--fail-on', 'none']));
  fs.writeFileSync(fixedReport, run([fixedLab, '--format', 'json', '--fail-on', 'none']));

  const comparison = runJson(['--compare', unsafeReport, fixedReport, '--format', 'json']);
  const inventory = runJson([unsafeLab, '--format', 'inventory-json', '--fail-on', 'none']);
  const score = run([unsafeLab, '--format', 'score', '--fail-on', 'none']);

  assert.deepEqual(comparison.summary, {
    previousFindings: 10,
    currentFindings: 0,
    introducedFindings: 0,
    resolvedFindings: 10,
    unchangedFindings: 0,
    addedFiles: 0,
    removedFiles: 0,
    addedSurfaces: 0,
    removedSurfaces: 0
  });
  assert.deepEqual(findingSnapshot(comparison.resolvedFindings), findingSnapshot(JSON.parse(fs.readFileSync(unsafeReport, 'utf8')).findings));
  assert.deepEqual(inventory.summary, {
    scannedFiles: 3,
    surfaces: 3,
    findings: 10,
    highest: 'critical'
  });
  assert.deepEqual(
    inventory.surfaces.map((surface) => `${surface.surface}:${surface.findings}:${surface.highest}`),
    ['github-workflow:6:critical', 'agent-context:2:high', 'mcp-config:2:critical']
  );
  assert.match(score, /AWI score: \*\*F \(0\/100\)\*\*/);
  assert.match(score, /Findings: \*\*10\*\*/);
  assert.match(score, /"message": "F 0\/100"/);
});

function runJson(args) {
  return JSON.parse(run(args));
}

function run(args) {
  const result = spawnSync(process.execPath, [bin, ...args], {
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

function findingSnapshot(findings) {
  return findings.map((finding) => `${finding.ruleId}:${finding.file}:${finding.line}:${finding.remediationCode}`);
}
