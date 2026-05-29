import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import { scanWorkflows, severityRank } from './scanner.js';
import { renderGithubAnnotations, renderJson, renderMarkdown, renderSarif, renderText } from './reporters.js';

const HELP = `Agentic Workflow Guard

Usage:
  awguard [path] [--format text|json|markdown|github|sarif] [--output file] [--fail-on none|low|medium|high|critical]

Examples:
  awguard .
  awguard .github/workflows/agent.yml --format markdown --fail-on high
  awguard . --format sarif --output awguard.sarif --fail-on none
  awguard . --format github --fail-on medium
`;

export async function runCli(args, env = process.env) {
  const options = parseArgs(args, env);

  if (options.help) {
    console.log(HELP.trim());
    return;
  }

  const result = scanWorkflows({ root: options.path });
  const output = render(result, options.format);

  if (options.output) {
    const outputFile = writeOutput(options.output, output);
    console.error(`Wrote ${outputFile}`);
  } else if (output.trim().length > 0) {
    console.log(output);
  }

  if (shouldFail(result.findings, options.failOn)) {
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
    } else if (!arg.startsWith('-')) {
      options.path = arg;
    } else {
      throw new Error(`unknown option: ${arg}`);
    }
  }

  validateEnum('format', options.format, ['text', 'json', 'markdown', 'github', 'sarif']);
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
  if (format === 'github') return renderGithubAnnotations(result);
  return renderText(result);
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
