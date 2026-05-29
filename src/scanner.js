import fs from 'node:fs';
import path from 'node:path';
import { findingFingerprint } from './fingerprints.js';

export const severityRank = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

const severityWeight = new Map(Object.entries(severityRank));

const workflowExtensions = new Set(['.yml', '.yaml']);

const untrustedFieldPattern =
  /\${{\s*github\.(?:event\.[\w.-]+\.)?(?:body|default_branch|email|head_ref|label|message|name|page_name|ref|title)\s*}}|github\.(?:event\.[\w.-]+\.)?(?:body|default_branch|email|head_ref|label|message|name|page_name|ref|title)/i;

const agentPattern =
  /\b(aider|anthropic|claude|codex|copilot|cursor|gemini|langchain|litellm|llm|mistral|ollama|openai|openrouter)\b|AI_API_KEY|ANTHROPIC_API_KEY|GEMINI_API_KEY|OPENAI_API_KEY/i;

const promptBoundaryPattern =
  /\b(prompt|system_prompt|user_prompt|instructions|message|messages|input|query|task)\b\s*[:=]/i;

const dangerousFlagPattern =
  /--dangerously-skip-permissions|--yolo|--allow-all|--unsafe|--auto-approve|--no-confirm|approval-mode\s+full-auto/i;

const commandSinkPattern =
  /\b(eval|bash\s+-c|sh\s+-c|python\s+-c|node\s+-e)\b|\|\s*(?:bash|sh)\b/i;

const modelOutputPattern =
  /\b(agent|ai|completion|llm|model|output|patch|plan|response|result)\b/i;

const untrustedTriggers = new Set([
  'discussion_comment',
  'issue_comment',
  'issues',
  'pull_request',
  'pull_request_review',
  'pull_request_target',
  'repository_dispatch',
  'workflow_run'
]);

export const ruleCatalog = {
  AWG001: {
    title: 'Untrusted text reaches an AI agent prompt',
    severity: 'high',
    suggestion:
      'Keep issue, PR, comment, and branch text out of privileged agent prompts unless it is reviewed, delimited, and sanitized. Run the agent with read-only permissions by default.'
  },
  AWG002: {
    title: 'Untrusted GitHub context is interpolated in a shell script',
    severity: 'high',
    suggestion:
      'Move the expression into an env variable and reference the shell variable with quotes, or pass the value to a JavaScript action as an argument.'
  },
  AWG003: {
    title: 'pull_request_target checks out untrusted pull request code',
    severity: 'critical',
    suggestion:
      'Use pull_request for untrusted builds, or keep pull_request_target limited to base-repository metadata work without checking out head SHA/ref.'
  },
  AWG004: {
    title: 'AI agent workflow has broad token permissions',
    severity: 'high',
    suggestion:
      'Set permissions to read-all or the smallest write scope required. Add manual approval before any agent can write code, comments, labels, or releases.'
  },
  AWG005: {
    title: 'Secrets are exposed in an untrusted agent workflow',
    severity: 'high',
    suggestion:
      'Do not provide repository, cloud, or model-provider secrets to workflows driven by untrusted issue/PR/comment text. Split privileged work into a separate approved workflow.'
  },
  AWG006: {
    title: 'Autonomous agent runs with unsafe approval flags',
    severity: 'high',
    suggestion:
      'Remove full-auto or skip-permission flags in CI. Require a human approval gate before tool use, file writes, command execution, or repository changes.'
  },
  AWG007: {
    title: 'Model or agent output may be executed by a script',
    severity: 'high',
    suggestion:
      'Treat model output as data. Write it to a file, validate it, and apply narrow parsers instead of eval, bash -c, sh -c, or pipe-to-shell patterns.'
  },
  AWG008: {
    title: 'Agent workflow does not declare permissions',
    severity: 'medium',
    suggestion:
      'Declare explicit permissions, usually contents: read for analysis workflows. Escalate write scopes only in a separate, reviewed job.'
  },
  AWG009: {
    title: 'workflow_run consumes artifacts before script execution',
    severity: 'medium',
    suggestion:
      'Treat artifacts from earlier workflows as untrusted. Verify provenance and contents before using them in privileged workflow_run jobs.'
  },
  AWG010: {
    title: 'Third-party action is not pinned to a commit SHA',
    severity: 'low',
    suggestion:
      'Pin third-party actions to a full commit SHA in security-sensitive agent workflows, and review the action before updating the pin.'
  }
};

export function scanWorkflows({ root = process.cwd() } = {}) {
  const absoluteRoot = path.resolve(root);
  const relativeBase = fs.statSync(absoluteRoot).isFile() ? path.dirname(absoluteRoot) : absoluteRoot;
  const files = discoverWorkflowFiles(absoluteRoot);
  const findings = files.flatMap((file) => scanWorkflowFile(file, relativeBase));

  findings.sort((a, b) => {
    const severityDelta = severityWeight.get(b.severity) - severityWeight.get(a.severity);
    if (severityDelta !== 0) return severityDelta;
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    return a.line - b.line;
  });

  return {
    root: relativeBase,
    scannedFiles: files,
    findings,
    summary: summarize(findings)
  };
}

export function scanWorkflowText(text, file = 'workflow.yml', root = process.cwd()) {
  const lines = text.split(/\r?\n/);
  const runBlocks = markRunBlocks(lines);
  const triggers = detectTriggers(text, lines);
  const hasUntrustedTrigger = [...triggers].some((trigger) => untrustedTriggers.has(trigger));
  const hasAgent = lines.some((line) => agentPattern.test(line));
  const hasPromptBoundary = lines.some((line) => promptBoundaryPattern.test(line));
  const hasPermissionBlock = /^\s*permissions\s*:/im.test(text);
  const hasBroadPermission = lines.some((line) => isBroadPermissionLine(line));
  const hasSecret = lines.some((line) => /\bsecrets\.[A-Z0-9_]+\b/i.test(line));

  const context = {
    file,
    relativeFile: path.isAbsolute(file) ? path.relative(root, file) || path.basename(file) : file,
    lines,
    runBlocks,
    triggers,
    hasAgent,
    hasPromptBoundary,
    hasUntrustedTrigger,
    hasPermissionBlock,
    hasBroadPermission,
    hasSecret,
    findings: [],
    seen: new Set()
  };

  detectPromptToAgent(context);
  detectScriptInjection(context);
  detectPullRequestTargetCheckout(context);
  detectBroadPermissions(context);
  detectSecretsInAgentWorkflow(context);
  detectUnsafeAgentFlags(context);
  detectModelOutputSinks(context);
  detectMissingPermissions(context);
  detectWorkflowRunArtifacts(context);
  detectUnpinnedActions(context);

  return context.findings;
}

function scanWorkflowFile(file, root) {
  const text = fs.readFileSync(file, 'utf8');
  return scanWorkflowText(text, file, root);
}

function discoverWorkflowFiles(root) {
  if (!fs.existsSync(root)) {
    throw new Error(`path does not exist: ${root}`);
  }

  const stat = fs.statSync(root);
  if (stat.isFile()) {
    return workflowExtensions.has(path.extname(root)) ? [root] : [];
  }

  const workflowDir = path.join(root, '.github', 'workflows');
  if (!fs.existsSync(workflowDir)) {
    return [];
  }

  return walk(workflowDir).filter((file) => workflowExtensions.has(path.extname(file)));
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (entry.isFile()) return [fullPath];
    return [];
  });
}

function detectPromptToAgent(context) {
  if (!context.hasAgent && !context.hasPromptBoundary) return;

  context.lines.forEach((line, index) => {
    if (!untrustedFieldPattern.test(line)) return;

    const windowText = windowAround(context.lines, index, 8).join('\n');
    if (!agentPattern.test(windowText) && !promptBoundaryPattern.test(windowText)) return;

    const severity = context.hasBroadPermission || context.hasSecret ? 'critical' : ruleCatalog.AWG001.severity;
    addFinding(context, 'AWG001', index + 1, {
      severity,
      evidence: line.trim(),
      message: 'User-controlled GitHub event text appears to be used as prompt/input for an AI agent.'
    });
  });
}

function detectScriptInjection(context) {
  context.lines.forEach((line, index) => {
    if (!untrustedFieldPattern.test(line)) return;
    if (!context.runBlocks.has(index) && !/^\s*run\s*:/.test(line)) return;

    addFinding(context, 'AWG002', index + 1, {
      evidence: line.trim(),
      message: 'A user-controlled GitHub expression is interpolated directly inside a run script.'
    });
  });
}

function detectPullRequestTargetCheckout(context) {
  if (!context.triggers.has('pull_request_target')) return;

  context.lines.forEach((line, index) => {
    if (!/uses\s*:\s*actions\/checkout@/i.test(line)) return;

    const checkoutBlock = windowAfter(context.lines, index, 8);
    const refIndex = checkoutBlock.findIndex((candidate) =>
      /github\.event\.pull_request\.head|github\.head_ref|head\.sha|head\.ref/i.test(candidate)
    );

    if (refIndex === -1) return;

    addFinding(context, 'AWG003', index + refIndex + 1, {
      evidence: checkoutBlock[refIndex].trim(),
      message: 'pull_request_target is checking out pull request head code in a privileged workflow.'
    });
  });
}

function detectBroadPermissions(context) {
  if (!context.hasAgent) return;

  context.lines.forEach((line, index) => {
    if (!isBroadPermissionLine(line)) return;

    addFinding(context, 'AWG004', index + 1, {
      evidence: line.trim(),
      message: 'An AI-agent workflow grants write-capable token permissions.'
    });
  });
}

function detectSecretsInAgentWorkflow(context) {
  if (!context.hasAgent || !context.hasUntrustedTrigger) return;

  context.lines.forEach((line, index) => {
    if (!/\bsecrets\.[A-Z0-9_]+\b/i.test(line)) return;

    addFinding(context, 'AWG005', index + 1, {
      evidence: line.trim(),
      message: 'A secret is available in a workflow triggered by untrusted event content and using an AI agent.'
    });
  });
}

function detectUnsafeAgentFlags(context) {
  context.lines.forEach((line, index) => {
    if (!dangerousFlagPattern.test(line)) return;

    const windowText = windowAround(context.lines, index, 6).join('\n');
    const severity = agentPattern.test(windowText) ? ruleCatalog.AWG006.severity : 'medium';

    addFinding(context, 'AWG006', index + 1, {
      severity,
      evidence: line.trim(),
      message: 'The workflow appears to run an agent with permission checks or confirmations disabled.'
    });
  });
}

function detectModelOutputSinks(context) {
  if (!context.hasAgent) return;

  context.lines.forEach((line, index) => {
    if (!commandSinkPattern.test(line) || !modelOutputPattern.test(line)) return;

    addFinding(context, 'AWG007', index + 1, {
      evidence: line.trim(),
      message: 'A command sink appears to execute data named like model or agent output.'
    });
  });
}

function detectMissingPermissions(context) {
  if (!context.hasAgent || context.hasPermissionBlock) return;

  const firstAgentLine = context.lines.findIndex((line) => agentPattern.test(line));
  if (firstAgentLine === -1) return;

  addFinding(context, 'AWG008', firstAgentLine + 1, {
    evidence: context.lines[firstAgentLine].trim(),
    message: 'This agent workflow does not declare an explicit GitHub token permission block.'
  });
}

function detectWorkflowRunArtifacts(context) {
  if (!context.triggers.has('workflow_run')) return;
  if (!/actions\/download-artifact@|download-artifact/i.test(context.lines.join('\n'))) return;

  const firstRunLine = context.lines.findIndex((line) => /^\s*run\s*:/.test(line));
  if (firstRunLine === -1) return;

  addFinding(context, 'AWG009', firstRunLine + 1, {
    evidence: context.lines[firstRunLine].trim(),
    message: 'A privileged workflow_run job downloads artifacts before executing script steps.'
  });
}

function detectUnpinnedActions(context) {
  if (!context.hasAgent) return;

  context.lines.forEach((line, index) => {
    const match = line.match(/\buses\s*:\s*([^@\s#]+)@([^\s#]+)/i);
    if (!match) return;

    const actionName = match[1];
    const ref = match[2].replace(/^['"]|['"]$/g, '');
    if (/^[a-f0-9]{40}$/i.test(ref)) return;
    if (/^(actions|github)\//i.test(actionName)) return;

    addFinding(context, 'AWG010', index + 1, {
      evidence: line.trim(),
      message: 'A third-party action in an agent workflow is referenced by a mutable tag or branch.'
    });
  });
}

function addFinding(context, ruleId, line, overrides = {}) {
  const docs = ruleCatalog[ruleId];
  const key = `${ruleId}:${line}:${overrides.evidence || ''}`;
  if (context.seen.has(key)) return;
  context.seen.add(key);

  const finding = {
    ruleId,
    title: docs.title,
    severity: overrides.severity || docs.severity,
    file: context.relativeFile,
    absoluteFile: context.file,
    line,
    message: overrides.message || docs.title,
    evidence: overrides.evidence || '',
    suggestion: overrides.suggestion || docs.suggestion
  };

  context.findings.push({
    ...finding,
    fingerprint: findingFingerprint(finding),
    baselineState: 'new'
  });
}

function summarize(findings) {
  const bySeverity = Object.fromEntries(Object.keys(severityRank).map((severity) => [severity, 0]));
  for (const finding of findings) {
    bySeverity[finding.severity] += 1;
  }

  const highest = findings.reduce((current, finding) => {
    return severityRank[finding.severity] > severityRank[current] ? finding.severity : current;
  }, 'none');

  return {
    total: findings.length,
    highest,
    bySeverity
  };
}

function detectTriggers(text, lines) {
  const triggers = new Set();
  const triggerNames = [...untrustedTriggers, 'push', 'schedule', 'workflow_dispatch'];

  for (const trigger of triggerNames) {
    const keyPattern = new RegExp(`^\\s*${escapeRegex(trigger)}\\s*:`, 'im');
    const arrayPattern = new RegExp(`\\bon\\s*:\\s*\\[[^\\]]*\\b${escapeRegex(trigger)}\\b`, 'i');
    const scalarPattern = new RegExp(`\\bon\\s*:\\s*${escapeRegex(trigger)}\\b`, 'i');

    if (keyPattern.test(text) || arrayPattern.test(text) || scalarPattern.test(text)) {
      triggers.add(trigger);
    }
  }

  lines.forEach((line) => {
    const trimmed = line.trim();
    const match = trimmed.match(/^-\s*([\w-]+)\s*$/);
    if (match && triggerNames.includes(match[1])) {
      triggers.add(match[1]);
    }
  });

  return triggers;
}

function markRunBlocks(lines) {
  const runBlocks = new Set();
  let activeIndent = null;

  lines.forEach((line, index) => {
    const indent = leadingSpaces(line);
    const startsRun = /^\s*run\s*:/.test(line);

    if (startsRun) {
      runBlocks.add(index);
      activeIndent = /run\s*:\s*[|>]\s*$/.test(line) ? indent : null;
      return;
    }

    if (activeIndent !== null) {
      if (line.trim() === '' || indent > activeIndent) {
        runBlocks.add(index);
        return;
      }
      activeIndent = null;
    }
  });

  return runBlocks;
}

function isBroadPermissionLine(line) {
  return (
    /^\s*permissions\s*:\s*write-all\s*(?:#.*)?$/i.test(line) ||
    /^\s*(actions|checks|contents|deployments|discussions|id-token|issues|packages|pages|pull-requests|repository-projects|security-events|statuses)\s*:\s*write\s*(?:#.*)?$/i.test(
      line
    )
  );
}

function windowAround(lines, index, radius) {
  return lines.slice(Math.max(0, index - radius), Math.min(lines.length, index + radius + 1));
}

function windowAfter(lines, index, count) {
  return lines.slice(index, Math.min(lines.length, index + count + 1));
}

function leadingSpaces(line) {
  const match = line.match(/^\s*/);
  return match ? match[0].length : 0;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
