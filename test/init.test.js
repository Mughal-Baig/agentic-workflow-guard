import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { renderInitGuide } from '../src/init.js';

const bin = path.resolve('bin', 'awguard.js');

test('renders init setup guide', () => {
  const guide = renderInitGuide();

  assert.match(guide, /Agentic Workflow Guard Setup/);
  assert.match(guide, /awguard.config.json/);
  assert.match(guide, /awguard.baseline.json/);
  assert.match(guide, /awguard.config.schema.json/);
});

test('CLI init prints setup guide without scanning a path', () => {
  const result = spawnSync(process.execPath, [bin, 'init'], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Agentic Workflow Guard Setup/);
});
