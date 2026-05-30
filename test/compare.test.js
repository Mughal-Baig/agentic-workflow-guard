import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildComparison, renderComparison, renderComparisonJson } from '../src/compare.js';

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
  assert.equal(comparison.summary.addedSurfaces, 1);
  assert.deepEqual(comparison.addedFiles, ['.mcp.json']);
  assert.deepEqual(comparison.addedSurfaces[0], {
    surface: 'mcp-config',
    label: 'MCP configs',
    files: ['.mcp.json']
  });
  assert.match(markdown, /Introduced Findings/);
  assert.match(markdown, /Resolved Findings/);
  assert.match(markdown, /Added Agentic Surfaces/);
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

test('CLI renders comparison as JSON when requested', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awguard-compare-json-'));
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
      scannedFiles: ['.github/workflows/agent.yml', '.mcp.json'],
      findings: [{ fingerprint: 'new', ruleId: 'AWG013', severity: 'high', file: '.mcp.json', line: 1, title: 'New' }]
    })
  );

  const result = spawnSync(process.execPath, [bin, '--compare', previousFile, currentFile, '--format', 'json'], {
    encoding: 'utf8'
  });
  const comparison = JSON.parse(result.stdout);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(comparison.summary.addedSurfaces, 2);
  assert.ok(comparison.addedSurfaces.some((surface) => surface.surface === 'github-workflow'));
});

test('renders comparison JSON from module API', () => {
  const comparison = JSON.parse(
    renderComparisonJson(
      { scannedFiles: ['AGENTS.md'], findings: [] },
      { scannedFiles: ['AGENTS.md', '.github/workflows/agent.yml'], findings: [] }
    )
  );

  assert.equal(comparison.summary.addedSurfaces, 1);
  assert.equal(comparison.addedSurfaces[0].surface, 'github-workflow');
});
