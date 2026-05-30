import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import {
  applyBaseline,
  createBaseline,
  loadBaseline,
  pruneBaseline,
  renderBaselineReview,
  reviewBaseline,
  writeBaseline
} from './baseline.js';
import { renderBadgeSnippets } from './badges.js';
import { loadReport, renderComparison, renderComparisonJson } from './compare.js';
import { renderDemoWalkthrough } from './demo.js';
import { loadConfig } from './config.js';
import { buildDoctorReport, renderDoctorReport } from './doctor.js';
import { renderRuleExplanation } from './explain.js';
import { renderInitGuide } from './init.js';
import { renderPolicyPack } from './policy-packs.js';
import { buildPolicyWizard, renderPolicyWizard } from './policy-wizard.js';
import { renderFixDryRun } from './remediation.js';
import { scanWorkflows, severityRank } from './scanner.js';
import { renderTemplates } from './templates.js';
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
  awguard explain [AWG###]
  awguard badges [--repo OWNER/REPO] [--branch main] [--badge-file docs/awguard-badge.json] [--site URL]
  awguard demo
  awguard templates [all|github|code-scanning|gitlab|pre-commit|vscode]
  awguard policy-pack [oss|strict|enterprise]
  awguard policy-wizard [path] [--config file] [--preset name] [--dry-run] [--format markdown|json] [--output file]
  awguard baseline-review [path] --baseline file [--config file] [--preset name] [--format text|json] [--prune]
  awguard --compare previous.json current.json

Examples:
  awguard init
  awguard doctor
  awguard explain AWG001
  awguard badges --repo OWNER/REPO --site https://OWNER.github.io/REPO/
  awguard demo
  awguard templates github
  awguard policy-pack strict
  awguard policy-wizard . --dry-run
  awguard baseline-review . --baseline awguard.baseline.json
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

  if (args[0] === 'explain') {
    console.log(renderRuleExplanation(args[1]));
    return;
  }

  if (args[0] === 'badges') {
    console.log(renderBadgeSnippets(parseBadgeArgs(args.slice(1))));
    return;
  }

  if (args[0] === 'demo') {
    console.log(renderDemoWalkthrough());
    return;
  }

  if (args[0] === 'templates') {
    console.log(renderTemplates(args[1] || 'all'));
    return;
  }

  if (args[0] === 'policy-pack') {
    console.log(renderPolicyPack(args[1] || 'oss'));
    return;
  }

  if (args[0] === 'policy-wizard') {
    const options = parsePolicyWizardArgs(args.slice(1));
    const loaded = loadConfig({ configPath: options.config, root: options.path, presets: options.presets });
    const result = scanWorkflows({ root: options.path, config: loaded.config });
    const wizard = buildPolicyWizard(result, { existingConfig: loaded.path ? JSON.parse(fs.readFileSync(loaded.path, 'utf8')) : {} });
    const output = renderPolicyWizard(wizard, { format: options.format });
    if (options.output && !options.dryRun) {
      const outputFile = writeOutput(options.output, `${output}\n`);
      console.error(`Wrote ${outputFile}`);
    } else {
      console.log(output);
    }
    return;
  }

  if (args[0] === 'baseline-review') {
    const options = parseBaselineReviewArgs(args.slice(1));
    if (!options.baseline) throw new Error('baseline-review requires --baseline file');
    const { config } = loadConfig({ configPath: options.config, root: options.path, presets: options.presets });
    const result = scanWorkflows({ root: options.path, config });
    const baseline = loadBaseline(options.baseline);
    const review = reviewBaseline(result, baseline);
    if (options.prune) {
      writeBaseline(options.baseline, pruneBaseline(baseline, review));
    }
    console.log(renderBaselineReview(review, { format: options.format, baselineFile: options.baseline }));
    if (options.prune && options.format !== 'json') console.error(`Pruned baseline ${path.resolve(options.baseline)}`);
    return;
  }

  const options = parseArgs(args, env);

  if (options.help) {
    console.log(HELP.trim());
    return;
  }

  if (options.compare.length > 0) {
    const previous = loadReport(options.compare[0]);
    const current = loadReport(options.compare[1]);
    const output = options.format === 'json' ? renderComparisonJson(previous, current) : renderComparison(previous, current);
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

function parsePolicyWizardArgs(args) {
  const options = {
    path: '.',
    config: '',
    presets: [],
    dryRun: false,
    format: 'markdown',
    formatSpecified: false,
    output: ''
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--config') {
      options.config = args[++index];
    } else if (arg.startsWith('--config=')) {
      options.config = arg.slice('--config='.length);
    } else if (arg === '--preset') {
      options.presets.push(...splitList(args[++index]));
    } else if (arg.startsWith('--preset=')) {
      options.presets.push(...splitList(arg.slice('--preset='.length)));
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--format') {
      options.format = args[++index];
      options.formatSpecified = true;
    } else if (arg.startsWith('--format=')) {
      options.format = arg.slice('--format='.length);
      options.formatSpecified = true;
    } else if (arg === '--output') {
      options.output = args[++index];
    } else if (arg.startsWith('--output=')) {
      options.output = arg.slice('--output='.length);
    } else if (!arg.startsWith('-')) {
      options.path = arg;
    } else {
      throw new Error(`unknown policy-wizard option: ${arg}`);
    }
  }

  if (options.output && !options.formatSpecified) options.format = 'json';
  validateEnum('policy-wizard format', options.format, ['markdown', 'json']);
  return options;
}

function parseBaselineReviewArgs(args) {
  const options = {
    path: '.',
    baseline: '',
    config: '',
    presets: [],
    format: 'text',
    prune: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--baseline') {
      options.baseline = args[++index];
    } else if (arg.startsWith('--baseline=')) {
      options.baseline = arg.slice('--baseline='.length);
    } else if (arg === '--config') {
      options.config = args[++index];
    } else if (arg.startsWith('--config=')) {
      options.config = arg.slice('--config='.length);
    } else if (arg === '--preset') {
      options.presets.push(...splitList(args[++index]));
    } else if (arg.startsWith('--preset=')) {
      options.presets.push(...splitList(arg.slice('--preset='.length)));
    } else if (arg === '--format') {
      options.format = args[++index];
    } else if (arg.startsWith('--format=')) {
      options.format = arg.slice('--format='.length);
    } else if (arg === '--prune') {
      options.prune = true;
    } else if (!arg.startsWith('-')) {
      options.path = arg;
    } else {
      throw new Error(`unknown baseline-review option: ${arg}`);
    }
  }

  validateEnum('baseline-review format', options.format, ['text', 'json']);
  return options;
}

function parseBadgeArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--repo') {
      options.repo = args[++index];
    } else if (arg.startsWith('--repo=')) {
      options.repo = arg.slice('--repo='.length);
    } else if (arg === '--branch') {
      options.branch = args[++index];
    } else if (arg.startsWith('--branch=')) {
      options.branch = arg.slice('--branch='.length);
    } else if (arg === '--badge-file') {
      options.badgeFile = args[++index];
    } else if (arg.startsWith('--badge-file=')) {
      options.badgeFile = arg.slice('--badge-file='.length);
    } else if (arg === '--site') {
      options.site = args[++index];
    } else if (arg.startsWith('--site=')) {
      options.site = arg.slice('--site='.length);
    } else {
      throw new Error(`unknown badges option: ${arg}`);
    }
  }
  return options;
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
