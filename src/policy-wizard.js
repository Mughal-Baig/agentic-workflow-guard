import fs from 'node:fs';
import path from 'node:path';
import { classifyScanFile } from './scanner.js';

const mcpRunnerCommands = new Set(['npx', 'pnpx', 'bunx', 'uvx', 'pipx']);
const schemaUrl =
  'https://raw.githubusercontent.com/Mughal-Baig/agentic-workflow-guard/main/schemas/awguard.config.schema.json';

export function buildPolicyWizard(result, { existingConfig = {} } = {}) {
  const policy = existingConfig.policy || {};
  const approvedFiles = mergeUnique(policy.approvedFiles || [], result.scannedFiles.map((file) => relativeFile(result.root, file)));
  const mcp = collectMcpAllowlist(result);

  const baseConfig = Object.keys(existingConfig).length > 0 ? existingConfig : { $schema: schemaUrl, extends: ['strict'] };
  const config = {
    ...baseConfig,
    policy: {
      approvedFiles,
      approvedMcpServers: mergeUnique(policy.approvedMcpServers || [], mcp.servers),
      approvedMcpPackages: mergeUnique(policy.approvedMcpPackages || [], mcp.packages),
      approvedMcpPackageScopes: mergeUnique(policy.approvedMcpPackageScopes || [], mcp.packageScopes),
      approvedMcpCommands: mergeUnique(policy.approvedMcpCommands || [], mcp.commands)
    }
  };

  return {
    summary: {
      approvedFiles: config.policy.approvedFiles.length,
      approvedMcpServers: config.policy.approvedMcpServers.length,
      approvedMcpPackages: config.policy.approvedMcpPackages.length,
      approvedMcpPackageScopes: config.policy.approvedMcpPackageScopes.length,
      approvedMcpCommands: config.policy.approvedMcpCommands.length
    },
    config,
    reviewSteps: [
      'Review every approved file before committing the policy.',
      'Pin mutable MCP packages and containers before approving them.',
      'Keep command allowlists narrow; prefer node, npx, uvx, and docker only when reviewed.'
    ]
  };
}

export function renderPolicyWizard(wizard, { format = 'markdown' } = {}) {
  if (format === 'json') return JSON.stringify(wizard.config, null, 2);

  return [
    '# AWGuard Policy Wizard',
    '',
    '| Allowlist | Count |',
    '| --- | ---: |',
    `| Files | ${wizard.summary.approvedFiles} |`,
    `| MCP servers | ${wizard.summary.approvedMcpServers} |`,
    `| MCP packages | ${wizard.summary.approvedMcpPackages} |`,
    `| MCP package scopes | ${wizard.summary.approvedMcpPackageScopes} |`,
    `| MCP commands | ${wizard.summary.approvedMcpCommands} |`,
    '',
    'Review steps:',
    '',
    ...wizard.reviewSteps.map((step) => `- ${step}`),
    '',
    'Starter config:',
    '',
    '```json',
    JSON.stringify(wizard.config, null, 2),
    '```'
  ].join('\n');
}

function collectMcpAllowlist(result) {
  const allowlist = {
    servers: [],
    packages: [],
    packageScopes: [],
    commands: []
  };

  for (const file of result.scannedFiles) {
    if (classifyScanFile(file, result.root) !== 'mcp-config') continue;
    const parsed = parseJsonLike(fs.readFileSync(file, 'utf8'));
    if (!parsed) continue;

    for (const server of collectMcpServers(parsed)) {
      if (server.name) allowlist.servers.push(server.name);
      const command = normalizeCommand(server.config.command);
      if (command) allowlist.commands.push(command);
      const packageSpec = findPackageSpec(command, arrayOfStrings(server.config.args));
      if (packageSpec) allowlist.packages.push(packageSpec);
      const packageScope = packageScopeFromSpec(packageSpec);
      if (packageScope) allowlist.packageScopes.push(packageScope);
    }
  }

  return {
    servers: uniqueSorted(allowlist.servers),
    packages: uniqueSorted(allowlist.packages),
    packageScopes: uniqueSorted(allowlist.packageScopes),
    commands: uniqueSorted(allowlist.commands)
  };
}

function collectMcpServers(config) {
  const servers = [];
  collectMcpContainer(config.mcpServers, servers);
  collectMcpContainer(config.servers, servers);
  if (config.projects && typeof config.projects === 'object') {
    for (const project of Object.values(config.projects)) {
      collectMcpContainer(project?.mcpServers, servers);
      collectMcpContainer(project?.servers, servers);
    }
  }
  return servers;
}

function collectMcpContainer(container, servers) {
  if (!container || typeof container !== 'object' || Array.isArray(container)) return;
  for (const [name, config] of Object.entries(container)) {
    if (config && typeof config === 'object' && !Array.isArray(config)) {
      servers.push({ name, config });
    }
  }
}

function parseJsonLike(text) {
  try {
    return JSON.parse(stripJsonComments(text).replace(/,\s*([}\]])/g, '$1'));
  } catch {
    return null;
  }
}

function stripJsonComments(text) {
  return text.replace(/(^|\s)\/\/.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '');
}

function findPackageSpec(command, args) {
  if (!mcpRunnerCommands.has(command)) return '';
  return args.find((arg) => !arg.startsWith('-') && !arg.includes('=')) || '';
}

function packageScopeFromSpec(packageSpec = '') {
  if (!packageSpec.startsWith('@')) return '';
  const slashIndex = packageSpec.indexOf('/');
  return slashIndex === -1 ? '' : packageSpec.slice(0, slashIndex + 1);
}

function arrayOfStrings(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

function normalizeCommand(value) {
  if (typeof value !== 'string') return '';
  return path.basename(value).toLowerCase();
}

function relativeFile(root, file) {
  return path.relative(root, file).split(path.sep).join('/') || path.basename(file);
}

function mergeUnique(existing, discovered) {
  return uniqueSorted([...existing, ...discovered].filter(Boolean).map(String));
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}
