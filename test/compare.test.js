import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildComparison, renderComparison } from '../src/compare.js';

const bin = path.resolve('bin', 'awguard.js');

test('compares previous and current awguard reports', () => {
  const previous = {
    scannedFiles: ['AGENTS.md'],
    findings: [
      {
        fingerprint: 'old',
        ruleId: 'AWG012',
        severity: 'high',
        file: 'AGENTS.md',
        line: 1,
        title: 'Old finding'
      }
    ]
  };
  const current = {
    scannedFiles: ['AGENTS.md', '.mcp.json'],
    findings: [
      {
        fingerprint: 'new',
        ruleId: 'AWG013',
        severity: 'high',
        file: '.mcp.json',
        line: 2,
        title: 'New finding'
      }
    ]
  };

  const comparison = buildComparison(previous, current);
  const markdown = renderComparison(previous, current);

  assert.equal(comparison.summary.introducedFindings, 1);
  assert.equal(comparison.summary.resolvedFindings, 1);
  assert.deepEqual(comparison.addedFiles, ['.mcp.json']);
  assert.match(markdown, /Introduced Findings/);
  assert.match(markdown, /Resolved Findings/);
});

test('CLI compares two json report files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awguard-compare-'));
  const previousFile = path.join(root, 'previous.json');
  const currentFile = path.join(root, 'current.json');
  fs.writeFileSync(
    previousFile,
    JSON.stringify({
      scannedFiles: ['AGENTS.md'],
      findings: [{ fingerprint: 'old', ruleId: 'AWG012', severity: 'high', file: 'AGENTS.md', line: 1, title: 'Old' }]
    })
  );
  fs.writeFileSync(
    currentFile,
    JSON.stringify({
      scannedFiles: ['.mcp.json'],
      findings: [{ fingerprint: 'new', ruleId: 'AWG013', severity: 'high', file: '.mcp.json', line: 1, title: 'New' }]
    })
  );

  const result = spawnSync(process.execPath, [bin, '--compare', previousFile, currentFile], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Introduced findings: \*\*1\*\*/);
});
