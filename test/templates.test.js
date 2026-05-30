import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import path from 'node:path';
import { renderPolicyPack } from '../src/policy-packs.js';
import { renderTemplates } from '../src/templates.js';

const bin = path.resolve('bin', 'awguard.js');

test('renders CI templates', () => {
  const github = renderTemplates('github');
  const all = renderTemplates('all');

  assert.match(github, /GitHub Actions Check/);
  assert.match(github, /Mughal-Baig\/agentic-workflow-guard@v0/);
  assert.match(all, /GitLab CI/);
  assert.match(all, /pre-commit Hook/);
});

test('CLI templates prints a selected template', () => {
  const result = spawnSync(process.execPath, [bin, 'templates', 'pre-commit'], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /pre-commit Hook/);
  assert.match(result.stdout, /npx awguard@latest/);
});

test('renders policy packs', () => {
  const strict = renderPolicyPack('strict');
  const enterprise = renderPolicyPack('enterprise');

  assert.match(strict, /Strict Repository/);
  assert.match(strict, /"approvedFiles": \[\]/);
  assert.match(enterprise, /Enterprise MCP Governance/);
  assert.match(enterprise, /"approvedMcpCommands"/);
});

test('CLI policy-pack prints JSON config snippet', () => {
  const result = spawnSync(process.execPath, [bin, 'policy-pack', 'oss'], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Open Source Maintainer/);
  assert.match(result.stdout, /awguard.config.schema.json/);
});
