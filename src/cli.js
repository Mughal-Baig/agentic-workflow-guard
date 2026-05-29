import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import { applyBaseline, createBaseline, loadBaseline, writeBaseline } from './baseline.js';
import { loadConfig } from './config.js';
import { renderFixDryRun } from './remediation.js';
import { scanWorkflows, severityRank } from './scanner.js';
import { renderGithubAnnotations, renderGraph, renderHtml, renderJson, renderMarkdown, renderSarif, renderText } from './reporters.js';

const HELP = `Agentic Workflow Guard

Usage:
  awguard [path] [--config file] [--preset name] [--format text|json|markdown|github|sarif|graph|html] [--output file] [--baseline file] [--write-baseline file] [--fix-dry-run] [--fail-on none|low|medium|high|critical]

Examples:
  awguard .
  awguard . --config awguard.config.json
  awguard . --preset strict --format graph
  awguard .github/workflows/agent.yml --format markdown --fail-on high
  awguard . --format html --output awguard-report.html
  awguard . --fix-dry-run
  awguard . --format sarif --output awguard.sarif --fail-on none
  awguard . --write-baseline awguard.baseline.json
  awguard . --baseline awguard.baseline.json --fail-on high
  awguard . --format github --fail-on medium
`;

export async function runCli(args, env = process.env) {
  const options = parseArgs(args, env);

  if (options.help) {
    console.log(HELP.trim());
    return;
  }

  const { config } = loadConfig({ configPath: options.config, root: options.path, presets: options.presets });
  let result = scanWorkflows({ root: options.path, config });

  if (options.baseline) {
    result = applyBaseline(result, loadBaseline(options.baseline));
  }

  if (options.writeBaseline) {
    const baselineFile = writeBaseline(options.writeBaseline, createBaseline(result));
    console.error(`Wrote baseline ${baselineFile}`);
  }

  const output = options.fixDryRun ? renderFixDryRun(result) : render(result, options.format);

  if (options.output) {
    const outputFile = writeOutput(options.output, output);
    console.error(`Wrote ${outputFile}`);
  } else if (output.trim().length > 0) {
    console.log(output);
  }

  const findingsToFailOn = result.findings.filter((finding) => finding.baselineState !== 'known');
  if (shouldFail(findingsToFailOn, options.failOn)) {
    process.exitCode = 1;
  }
}

export function parseArgs(args, env = {}) {
  const isAction = env.GITHUB_ACTIONS === 'true' && Boolean(env.GITHUB_ACTION);
  const options = {
    path: readInput(env, 'path') || '.',
    format: readInput(env, 'format') || (isAction ? 'github' : 'text'),
    failOn: readInput(env, 'fail_on') || readInput(env, 'fail-on') || (isAction ? 'high' : 'none'),
    output: readInput(env, 'output') || '',
    baseline: readInput(env, 'baseline') || '',
    writeBaseline: readInput(env, 'write_baseline') || readInput(env, 'write-baseline') || '',
    config: readInput(env, 'config') || '',
    presets: splitList(readInput(env, 'preset') || readInput(env, 'presets') || ''),
    fixDryRun: readBoolInput(env, 'fix_dry_run') || readBoolInput(env, 'fix-dry-run'),
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--format') {
      options.format = args[++index];
    } else if (arg.startsWith('--format=')) {
      options.format = arg.slice('--format='.length);
    } else if (arg === '--fail-on') {
      options.failOn = args[++index];
    } else if (arg.startsWith('--fail-on=')) {
      options.failOn = arg.slice('--fail-on='.length);
    } else if (arg === '--output') {
      options.output = args[++index];
    } else if (arg.startsWith('--output=')) {
      options.output = arg.slice('--output='.length);
    } else if (arg === '--baseline') {
      options.baseline = args[++index];
    } else if (arg.startsWith('--baseline=')) {
      options.baseline = arg.slice('--baseline='.length);
    } else if (arg === '--write-baseline') {
      options.writeBaseline = args[++index];
    } else if (arg.startsWith('--write-baseline=')) {
      options.writeBaseline = arg.slice('--write-baseline='.length);
    } else if (arg === '--config') {
      options.config = args[++index];
    } else if (arg.startsWith('--config=')) {
      options.config = arg.slice('--config='.length);
    } else if (arg === '--preset') {
      options.presets.push(...splitList(args[++index]));
    } else if (arg.startsWith('--preset=')) {
      options.presets.push(...splitList(arg.slice('--preset='.length)));
    } else if (arg === '--fix-dry-run') {
      options.fixDryRun = true;
    } else if (!arg.startsWith('-')) {
      options.path = arg;
    } else {
      throw new Error(`unknown option: ${arg}`);
    }
  }

  validateEnum('format', options.format, ['text', 'json', 'markdown', 'github', 'sarif', 'graph', 'html']);
  validateEnum('fail-on', options.failOn, ['none', 'low', 'medium', 'high', 'critical']);

  return options;
}

function readInput(env, name) {
  const normalized = name.toUpperCase().replaceAll('-', '_');
  return env[`INPUT_${normalized}`] || env[`INPUT_${name.toUpperCase()}`] || '';
}

function render(result, format) {
  if (format === 'json') return renderJson(result);
  if (format === 'markdown') return renderMarkdown(result);
  if (format === 'sarif') return renderSarif(result);
  if (format === 'graph') return renderGraph(result);
  if (format === 'html') return renderHtml(result);
  if (format === 'github') return renderGithubAnnotations(result);
  return renderText(result);
}

function splitList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function readBoolInput(env, name) {
  const value = readInput(env, name);
  return value === 'true' || value === '1' || value === 'yes';
}

function writeOutput(file, output) {
  const absoluteFile = path.resolve(file);
  fs.mkdirSync(path.dirname(absoluteFile), { recursive: true });
  fs.writeFileSync(absoluteFile, output);
  return absoluteFile;
}

function shouldFail(findings, threshold) {
  if (threshold === 'none') return false;
  const thresholdRank = severityRank[threshold];
  return findings.some((finding) => severityRank[finding.severity] >= thresholdRank);
}

function validateEnum(name, value, allowed) {
  if (!allowed.includes(value)) {
    throw new Error(`${name} must be one of: ${allowed.join(', ')}`);
  }
}
