import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.js';
import { scanWorkflows } from './scanner.js';

const schemaPath = 'schemas/awguard.config.schema.json';

export function buildDoctorReport({ root = '.', configPath = '', presets = [], env = process.env } = {}) {
  const checks = [];
  const packageInfo = readPackageInfo();
  const packageRoot = getPackageRoot();

  addCheck(
    checks,
    nodeMajor(process.version) >= 20 ? 'ok' : 'fail',
    'Node.js runtime',
    `${process.version} detected; AWGuard requires Node.js 20 or newer.`,
    'Install a current Node.js release before running AWGuard.'
  );

  addCheck(
    checks,
    packageInfo.version ? 'ok' : 'warn',
    'AWGuard package metadata',
    packageInfo.version ? `awguard ${packageInfo.version}` : 'Could not read package.json version.',
    'Reinstall the package if this command is running from a broken checkout.'
  );

  const absoluteRoot = path.resolve(root);
  if (!fs.existsSync(absoluteRoot)) {
    addCheck(
      checks,
      'fail',
      'Scan target',
      `Target does not exist: ${absoluteRoot}`,
      'Pass a repository directory, workflow file, agent instruction file, or MCP config file.'
    );
    return finish(checks);
  }

  const targetStat = fs.statSync(absoluteRoot);
  addCheck(
    checks,
    targetStat.isDirectory() || targetStat.isFile() ? 'ok' : 'fail',
    'Scan target',
    `${absoluteRoot} is a ${targetStat.isDirectory() ? 'directory' : targetStat.isFile() ? 'file' : 'special file'}.`,
    'Pass a regular file or directory.'
  );

  let configResult;
  try {
    configResult = loadConfig({ configPath, root: absoluteRoot, presets });
    addCheck(
      checks,
      'ok',
      'Configuration',
      configResult.path
        ? `Loaded ${path.relative(process.cwd(), configResult.path) || configResult.path}.`
        : 'No config file found; using defaults and CLI presets.',
      `Add "$schema": "https://raw.githubusercontent.com/Mughal-Baig/agentic-workflow-guard/main/${schemaPath}" to awguard.config.json for editor validation.`
    );
  } catch (error) {
    addCheck(checks, 'fail', 'Configuration', error.message, 'Fix the config file or run without --config.');
    return finish(checks);
  }

  addCheck(
    checks,
    fs.existsSync(path.join(packageRoot, schemaPath)) ? 'ok' : 'warn',
    'Config schema',
    `Schema path: ${schemaPath}`,
    'Publish package files with the schemas directory included.'
  );

  let result;
  try {
    result = scanWorkflows({ root: absoluteRoot, config: configResult.config });
  } catch (error) {
    addCheck(checks, 'fail', 'Scanner smoke test', error.message, 'Check file permissions and scan target contents.');
    return finish(checks);
  }

  if (result.scannedFiles.length === 0) {
    addCheck(
      checks,
      'warn',
      'Scanner smoke test',
      'No GitHub Actions workflow, agent instruction, or MCP config files were found.',
      'Run AWGuard again after adding agent workflows, AGENTS.md-style files, or MCP configs.'
    );
  } else {
    const findingText =
      result.findings.length === 0
        ? 'no findings'
        : `${result.findings.length} finding(s), highest severity ${result.summary.highest}`;
    addCheck(
      checks,
      result.findings.length === 0 ? 'ok' : 'warn',
      'Scanner smoke test',
      `Scanned ${result.scannedFiles.length} file(s); ${findingText}.`,
      'Use --format score, --format inventory, or --format sarif for CI-ready reports.'
    );
  }

  if (env.GITHUB_ACTIONS === 'true') {
    addCheck(
      checks,
      env.GITHUB_STEP_SUMMARY ? 'ok' : 'warn',
      'GitHub Actions summary',
      env.GITHUB_STEP_SUMMARY
        ? 'GITHUB_STEP_SUMMARY is available for job summary output.'
        : 'GITHUB_STEP_SUMMARY is not available in this environment.',
      'Run inside a modern GitHub Actions job to receive the Markdown job summary.'
    );
  }

  return finish(checks);
}

export function renderDoctorReport(report) {
  const lines = [
    '# Agentic Workflow Guard Doctor',
    '',
    `Status: **${report.status.toUpperCase()}**`,
    '',
    '| Check | Status | Detail |',
    '| --- | --- | --- |'
  ];

  for (const check of report.checks) {
    lines.push(`| ${escapeMarkdown(check.title)} | ${statusLabel(check.status)} | ${escapeMarkdown(check.detail)} |`);
  }

  const nextSteps = report.checks.filter((check) => check.status !== 'ok' && check.nextStep);
  if (nextSteps.length > 0) {
    lines.push('', '## Next Steps', '');
    for (const check of nextSteps) {
      lines.push(`- ${check.title}: ${check.nextStep}`);
    }
  }

  return lines.join('\n');
}

function addCheck(checks, status, title, detail, nextStep = '') {
  checks.push({ status, title, detail, nextStep });
}

function finish(checks) {
  return {
    status: checks.some((check) => check.status === 'fail')
      ? 'fail'
      : checks.some((check) => check.status === 'warn')
        ? 'warn'
        : 'ok',
    checks
  };
}

function nodeMajor(version) {
  const match = String(version).match(/^v?(\d+)/);
  return match ? Number(match[1]) : 0;
}

function readPackageInfo() {
  const packageFile = path.join(getPackageRoot(), 'package.json');
  try {
    return JSON.parse(fs.readFileSync(packageFile, 'utf8'));
  } catch {
    return {};
  }
}

function getPackageRoot() {
  const sourceDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(sourceDir, '..');
}

function statusLabel(status) {
  if (status === 'ok') return 'OK';
  if (status === 'warn') return 'WARN';
  return 'FAIL';
}

function escapeMarkdown(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
}
