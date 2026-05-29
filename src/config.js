import fs from 'node:fs';
import path from 'node:path';
import { ruleCatalog, severityRank } from './scanner.js';

const configFileNames = ['awguard.config.json', '.awguard.json'];
const configurableSeverities = Object.keys(severityRank).filter((severity) => severity !== 'none');

export function loadConfig({ configPath = '', root = process.cwd() } = {}) {
  const resolvedPath = resolveConfigPath(configPath, root);
  if (!resolvedPath) {
    return { path: null, config: normalizeConfig({}) };
  }

  const parsed = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  return {
    path: resolvedPath,
    config: normalizeConfig(parsed, resolvedPath)
  };
}

export function normalizeConfig(rawConfig = {}, source = 'config') {
  if (!isObject(rawConfig)) {
    throw new Error(`${source} must contain a JSON object`);
  }

  return {
    rules: normalizeRules(rawConfig.rules || {}, source),
    suppressions: normalizeSuppressions(rawConfig.suppressions || {}, source)
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

function ensureKnownRule(ruleId, source) {
  if (!ruleCatalog[ruleId]) {
    throw new Error(`${source} references unknown rule id: ${ruleId}`);
  }
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
