import fs from 'node:fs';
import path from 'node:path';
import { getPreset, listPresetNames } from './presets.js';
import { ruleCatalog, severityRank } from './scanner.js';

const configFileNames = ['awguard.config.json', '.awguard.json'];
const configurableSeverities = Object.keys(severityRank).filter((severity) => severity !== 'none');

export function loadConfig({ configPath = '', root = process.cwd(), presets = [] } = {}) {
  const resolvedPath = resolveConfigPath(configPath, root);
  if (!resolvedPath) {
    return { path: null, config: normalizeConfig({ extends: presets }) };
  }

  const parsed = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  const configWithPresets = {
    ...parsed,
    extends: [...presets, ...toArray(parsed.extends)]
  };

  return {
    path: resolvedPath,
    config: normalizeConfig(configWithPresets, resolvedPath)
  };
}

export function normalizeConfig(rawConfig = {}, source = 'config') {
  if (!isObject(rawConfig)) {
    throw new Error(`${source} must contain a JSON object`);
  }

  const mergedConfig = mergePresetConfigs(rawConfig, source);

  return {
    rules: normalizeRules(mergedConfig.rules || {}, source),
    suppressions: normalizeSuppressions(mergedConfig.suppressions || {}, source),
    policy: normalizePolicy(mergedConfig.policy || {}, source),
    scan: normalizeScan(mergedConfig.scan || {}, source)
  };
}

function mergePresetConfigs(rawConfig, source) {
  const presetNames = toArray(rawConfig.extends);
  let merged = {};

  for (const presetName of presetNames) {
    const preset = getPreset(presetName);
    if (!preset) {
      throw new Error(`${source} references unknown preset: ${presetName}. Available presets: ${listPresetNames().join(', ')}`);
    }
    merged = mergeConfigObjects(merged, preset);
  }

  return mergeConfigObjects(merged, {
    rules: rawConfig.rules || {},
    suppressions: rawConfig.suppressions || {},
    policy: rawConfig.policy || {},
    scan: rawConfig.scan || {}
  });
}

function mergeConfigObjects(base, override) {
  return {
    rules: {
      ...(base.rules || {}),
      ...(override.rules || {})
    },
    suppressions: {
      ...(base.suppressions || {}),
      ...(override.suppressions || {})
    },
    policy: {
      ...(base.policy || {}),
      ...(override.policy || {})
    },
    scan: {
      ...(base.scan || {}),
      ...(override.scan || {})
    }
  };
}

function resolveConfigPath(configPath, root) {
  if (configPath) {
    const explicitPath = path.resolve(configPath);
    if (!fs.existsSync(explicitPath)) {
      throw new Error(`config file does not exist: ${explicitPath}`);
    }
    return explicitPath;
  }

  const absoluteRoot = path.resolve(root);
  if (!fs.existsSync(absoluteRoot)) return null;

  const baseDir = fs.statSync(absoluteRoot).isFile() ? path.dirname(absoluteRoot) : absoluteRoot;
  for (const name of configFileNames) {
    const candidate = path.join(baseDir, name);
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

function normalizeRules(rules, source) {
  if (!isObject(rules)) {
    throw new Error(`${source} rules must be an object`);
  }

  const normalized = {};
  for (const [ruleId, value] of Object.entries(rules)) {
    const upperRuleId = ruleId.toUpperCase();
    ensureKnownRule(upperRuleId, source);
    normalized[upperRuleId] = normalizeRuleValue(value, upperRuleId, source);
  }

  return normalized;
}

function normalizeRuleValue(value, ruleId, source) {
  if (typeof value === 'string') {
    return normalizeRuleSeverity(value, ruleId, source);
  }

  if (isObject(value) && typeof value.severity === 'string') {
    return normalizeRuleSeverity(value.severity, ruleId, source);
  }

  throw new Error(`${source} rule ${ruleId} must be "off", a severity string, or an object with a severity string`);
}

function normalizeRuleSeverity(value, ruleId, source) {
  const severity = value.toLowerCase();
  if (severity === 'off') return { enabled: false };
  if (configurableSeverities.includes(severity)) return { enabled: true, severity };
  throw new Error(`${source} rule ${ruleId} severity must be one of: off, ${configurableSeverities.join(', ')}`);
}

function normalizeSuppressions(suppressions, source) {
  if (!isObject(suppressions)) {
    throw new Error(`${source} suppressions must be an object`);
  }

  const minimumReasonLength =
    suppressions.minimumReasonLength === undefined ? 10 : Number(suppressions.minimumReasonLength);
  if (!Number.isInteger(minimumReasonLength) || minimumReasonLength < 1) {
    throw new Error(`${source} suppressions.minimumReasonLength must be a positive integer`);
  }

  const allowedRules = suppressions.allowedRules || [];
  if (!Array.isArray(allowedRules)) {
    throw new Error(`${source} suppressions.allowedRules must be an array`);
  }

  const normalizedAllowedRules = allowedRules.map((ruleId) => String(ruleId).toUpperCase());
  normalizedAllowedRules.forEach((ruleId) => ensureKnownRule(ruleId, source));

  return {
    allow: suppressions.allow !== false,
    allowedRules: normalizedAllowedRules,
    minimumReasonLength
  };
}

function normalizePolicy(policy, source) {
  if (!isObject(policy)) {
    throw new Error(`${source} policy must be an object`);
  }

  return {
    approvedFiles: normalizeStringArray(policy.approvedFiles || [], `${source} policy.approvedFiles`),
    approvedMcpServers: normalizeStringArray(policy.approvedMcpServers || [], `${source} policy.approvedMcpServers`),
    approvedMcpPackages: normalizeStringArray(policy.approvedMcpPackages || [], `${source} policy.approvedMcpPackages`),
    approvedMcpCommands: normalizeStringArray(policy.approvedMcpCommands || [], `${source} policy.approvedMcpCommands`)
  };
}

function normalizeScan(scan, source) {
  if (!isObject(scan)) {
    throw new Error(`${source} scan must be an object`);
  }

  return {
    include: normalizeStringArray(scan.include || [], `${source} scan.include`),
    exclude: normalizeStringArray(scan.exclude || [], `${source} scan.exclude`)
  };
}

function normalizeStringArray(value, source) {
  if (!Array.isArray(value)) {
    throw new Error(`${source} must be an array`);
  }

  return value.map((item) => String(item));
}

function ensureKnownRule(ruleId, source) {
  if (!ruleCatalog[ruleId]) {
    throw new Error(`${source} references unknown rule id: ${ruleId}`);
  }
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toArray(value) {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) return value.map(String);
  return [String(value)];
}
