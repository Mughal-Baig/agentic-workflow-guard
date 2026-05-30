import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import path from 'node:path';
import { renderBadgeSnippets } from '../src/badges.js';
import { renderDemoWalkthrough } from '../src/demo.js';
import { renderRuleExplanation } from '../src/explain.js';

const bin = path.resolve('bin', 'awguard.js');

test('renders rule explanation and rule index', () => {
  const rule = renderRuleExplanation('AWG001');
  const index = renderRuleExplanation();

  assert.match(rule, /AWG001: Untrusted text reaches an AI agent prompt/);
  assert.match(rule, /Why it matters/);
  assert.match(index, /AWG015/);
});

test('CLI explain prints a rule explanation', () => {
  const result = spawnSync(process.execPath, [bin, 'explain', 'AWG013'], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /AWG013/);
  assert.match(result.stdout, /MCP configs/);
});

test('renders README badge snippets', () => {
  const output = renderBadgeSnippets({
    repo: 'Mughal-Baig/agentic-workflow-guard',
    branch: 'main',
    badgeFile: 'docs/awguard-badge.json',
    site: 'https://mughal-baig.github.io/agentic-workflow-guard/'
  });

  assert.match(output, /AWI risk/);
  assert.match(output, /Mughal-Baig\/agentic-workflow-guard/);
  assert.match(output, /Project site/);
});

test('CLI badges prints snippets with repository options', () => {
  const result = spawnSync(
    process.execPath,
    [bin, 'badges', '--repo', 'Mughal-Baig/agentic-workflow-guard', '--site', 'https://example.test'],
    { encoding: 'utf8' }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /GitHub Action/);
  assert.match(result.stdout, /https:\/\/example\.test/);
});

test('renders built-in demo walkthrough', () => {
  const output = renderDemoWalkthrough();

  assert.match(output, /Agentic Workflow Guard Demo/);
  assert.match(output, /Unsafe/);
  assert.match(output, /Fixed/);
  assert.match(output, /Resolved findings/);
});

test('CLI demo prints offline vulnerable lab walkthrough', () => {
  const result = spawnSync(process.execPath, [bin, 'demo'], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Unsafe Findings/);
  assert.match(result.stdout, /Fixed Result/);
});
