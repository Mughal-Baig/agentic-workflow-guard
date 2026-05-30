import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import { applyBaseline, createBaseline, loadBaseline, writeBaseline } from './baseline.js';
import { loadReport, renderComparison } from './compare.js';
import { loadConfig } from './config.js';
import { buildDoctorReport, renderDoctorReport } from './doctor.js';
import { renderInitGuide } from './init.js';
import { renderFixDryRun } from './remediation.js';
import { scanWorkflows, severityRank } from './scanner.js';
import {
  renderBadge,
  renderGithubAnnotations,
  renderGraph,
  renderGithubStepSummary,
  renderHtml,
  renderJson,
  renderMarkdown,
  renderMigration,
  renderSarif,
  renderScore,
  renderSurfaceInventory,
  renderSurfaceInventoryJson,
  renderText
} from './reporters.js';

const HELP = `Agentic Workflow Guard

Usage:
  awguard [path] [--config file] [--preset name] [--format text|json|markdown|github|sarif|graph|html|migration|score|badge|inventory|inventory-json] [--output file] [--baseline file] [--write-baseline file] [--fix-dry-run] [--fail-on none|low|medium|high|critical]
  awguard init
  awguard doctor [path] [--config file] [--preset name]
  awguard --compare previous.json current.json

Examples:
  awguard init
  awguard doctor
  awguard .
  awguard .mcp.json
  awguard . --config awguard.config.json
  awguard . --preset strict --format graph
  awguard .github/workflows/agent.yml --format markdown --fail-on high
  awguard . --format html --output awguard-report.html
  awguard . --format migration --output awguard-migration.md
  awguard . --format inventory
  awguard . --format inventory-json --output awguard-inventory.json
  awguard . --format score
  awguard . --format badge --output awguard-badge.json
  awguard . --fix-dry-run
  awguard . --format sarif --output awguard.sarif --fail-on none
  awguard . --write-baseline awguard.baseline.json
  awguard . --baseline awguard.baseline.json --fail-on high
  awguard --compare old-awguard.json new-awguard.json
  awguard . --format github --fail-on medium
`;

export async function runCli(args, env = process.env) {
  if (args[0] === 'init') {
    console.log(renderInitGuide());
    return;
  }

  if (args[0] === 'doctor') {
    const options = parseArgs(args.slice(1), env);
    const report = buildDoctorReport({
      root: options.path,
      configPath: options.config,
      presets: options.presets,
      env
    });
    console.log(renderDoctorReport(report));
    if (report.status === 'fail') process.exitCode = 1;
    return;
  }

  const options = parseArgs(args, env);

  if (options.help) {
    console.log(HELP.trim());
    return;
  }

  if (options.compare.length > 0) {
    const output = renderComparison(loadReport(options.compare[0]), loadReport(options.compare[1]));
    if (options.output) {
      const outputFile = writeOutput(options.output, output);
      console.error(`Wrote ${outputFile}`);
    } else {
      console.log(output);
    }
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

  let outputFile = '';
  if (options.output) {
    outputFile = writeOutput(options.output, output);
    console.error(`Wrote ${outputFile}`);
  } else if (output.trim().length > 0) {
    console.log(output);
  }

  writeGithubStepSummary({ env, result, options, outputFile });

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
    compare: [],
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
    } else if (arg === '--compare') {
      options.compare = [args[++index], args[++index]].filter(Boolean);
    } else if (arg.startsWith('--compare=')) {
      options.compare = arg.slice('--compare='.length).split(',').map((item) => item.trim()).filter(Boolean);
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

  validateEnum('format', options.format, [
    'text',
    'json',
    'markdown',
    'github',
    'sarif',
    'graph',
    'html',
    'migration',
    'score',
    'badge',
    'inventory',
    'inventory-json'
  ]);
  validateEnum('fail-on', options.failOn, ['none', 'low', 'medium', 'high', 'critical']);
  if (options.compare.length !== 0 && options.compare.length !== 2) {
    throw new Error('--compare requires two awguard --format json report files');
  }

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
  if (format === 'migration') return renderMigration(result);
  if (format === 'score') return renderScore(result);
  if (format === 'badge') return renderBadge(result);
  if (format === 'inventory') return renderSurfaceInventory(result);
  if (format === 'inventory-json') return renderSurfaceInventoryJson(result);
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

function writeGithubStepSummary({ env, result, options, outputFile }) {
  if (env.GITHUB_ACTIONS !== 'true' || !env.GITHUB_STEP_SUMMARY) return;

  try {
    fs.appendFileSync(
      env.GITHUB_STEP_SUMMARY,
      `${renderGithubStepSummary(result, { format: options.format, failOn: options.failOn, outputFile })}\n`
    );
  } catch (error) {
    console.error(`awguard: could not write GitHub job summary: ${error.message}`);
  }
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
