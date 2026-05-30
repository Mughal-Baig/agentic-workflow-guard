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

const agentInstructionFiles = new Set([
  'AGENTS.md',
  'CLAUDE.md',
  'CODEX.md',
  'GEMINI.md',
  '.cursorrules',
  '.windsurfrules',
  '.clinerules',
  '.github/copilot-instructions.md'
]);

const mcpConfigFiles = new Set([
  '.mcp.json',
  'mcp.json',
  '.vscode/mcp.json',
  '.cursor/mcp.json',
  '.windsurf/mcp_config.json',
  '.codeium/windsurf/mcp_config.json',
  'cline_mcp_settings.json',
  '.cline/mcp_settings.json',
  '.roo/mcp.json',
  '.kilocode/mcp.json',
  'claude_desktop_config.json'
]);

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

const suppressionPattern = /#\s*awguard-disable-(next-line|line)\b(.*)$/i;

const riskyAgentInstructionPattern =
  /--dangerously-skip-permissions|--yolo|--allow-all|--unsafe|--auto-approve|--no-confirm|approval-mode\s+full-auto|bypass\s+(?:all\s+)?permissions|skip\s+(?:all\s+)?permission prompts|never ask (?:for )?(?:approval|confirmation|permission)|do not ask (?:for )?(?:approval|confirmation|permission)|act without (?:approval|confirmation|permission)/i;

const untrustedCommandInstructionPattern =
  /\b(?:follow|obey|execute|run|apply)\b.{0,80}\b(?:issue|pull request|pr|comment|review|branch)\b.{0,80}\b(?:instruction|instructions|request|requests|command|commands|body|title|text)\b/i;

const secretExposureInstructionPattern =
  /\b(?:print|echo|log|include|send|expose|return|paste)\b.{0,80}\b(?:secret|secrets|token|tokens|api key|api keys|apikey|apikeys|credential|credentials|password|passwords)\b/i;

const mcpPackageRunnerCommands = new Set(['npx', 'pnpx', 'bunx', 'uvx', 'pipx']);

const mcpShellCommands = new Set(['bash', 'sh', 'zsh', 'fish', 'cmd', 'powershell', 'pwsh']);

const mcpSecretKeyPattern =
  /\b(?:authorization|auth|api[_-]?key|apikey|token|secret|password|passwd|credential|client[_-]?secret|cookie|session)\b/i;

const mcpSecretFlagPattern = /^--?(?:api[_-]?key|apikey|token|secret|password|passwd|credential|client[_-]?secret|auth|authorization)(?:=|$)/i;

const mcpSecretValuePattern =
  /\b(?:Bearer\s+[A-Za-z0-9._~+/=-]{8,}|ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{12,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16})\b/i;

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
  },
  AWG011: {
    title: 'Invalid suppression comment',
    severity: 'medium',
    suggestion:
      'Use awguard-disable-next-line or awguard-disable-line with rule ids and a clear reason after --, for example: # awguard-disable-next-line AWG001 -- reviewed false positive.'
  },
  AWG012: {
    title: 'Agent instruction file weakens review or permission boundaries',
    severity: 'high',
    suggestion:
      'Keep AGENTS.md, CLAUDE.md, GEMINI.md, Copilot instructions, and other persistent agent instruction files conservative. Do not tell agents to bypass approvals, follow untrusted issue/PR text as commands, or expose secrets.'
  },
  AWG013: {
    title: 'MCP config starts mutable or shell-based tool servers',
    severity: 'high',
    suggestion:
      'Pin MCP server packages to exact versions or container digests, avoid shell wrappers, and review project-scoped MCP servers before agents can use them.'
  },
  AWG014: {
    title: 'MCP config hardcodes secrets or auth material',
    severity: 'critical',
    suggestion:
      'Move MCP credentials into input prompts, environment variables, or a secret manager. Do not commit bearer tokens, API keys, passwords, or auth headers in MCP config files.'
  },
  AWG015: {
    title: 'Agentic surface is not approved by policy',
    severity: 'medium',
    suggestion:
      'Add the workflow, agent context file, MCP config, MCP server, package, or command to the policy allowlist only after review. Otherwise remove or harden it.'
  }
};

export function scanWorkflows({ root = process.cwd(), config = {} } = {}) {
  const absoluteRoot = path.resolve(root);
  const relativeBase = fs.statSync(absoluteRoot).isFile() ? path.dirname(absoluteRoot) : absoluteRoot;
  const files = discoverScanFiles(absoluteRoot);
  const findings = files.flatMap((file) => scanFile(file, relativeBase, config));

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

export function scanWorkflowText(text, file = 'workflow.yml', root = process.cwd(), config = {}) {
  const lines = text.split(/\r?\n/);
  const runBlocks = markRunBlocks(lines);
  const triggers = detectTriggers(text, lines);
  const hasUntrustedTrigger = [...triggers].some((trigger) => untrustedTriggers.has(trigger));
  const hasAgent = lines.some((line) => agentPattern.test(line));
  const hasPromptBoundary = lines.some((line) => promptBoundaryPattern.test(line));
  const hasPermissionBlock = /^\s*permissions\s*:/im.test(text);
  const hasBroadPermission = lines.some((line) => isBroadPermissionLine(line));
  const hasSecret = lines.some((line) => /\bsecrets\.[A-Z0-9_]+\b/i.test(line));
  const { suppressions, invalidSuppressions } = collectSuppressions(lines, config.suppressions || {});

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
    config,
    suppressions,
    invalidSuppressions,
    suppressedFindings: [],
    findings: [],
    seen: new Set()
  };

  detectInvalidSuppressions(context);
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

export function scanAgentInstructionText(text, file = 'AGENTS.md', root = process.cwd(), config = {}) {
  const lines = text.split(/\r?\n/);
  const { suppressions, invalidSuppressions } = collectSuppressions(lines, config.suppressions || {});
  const context = {
    file,
    relativeFile: path.isAbsolute(file) ? path.relative(root, file) || path.basename(file) : file,
    lines,
    runBlocks: new Set(),
    triggers: new Set(),
    hasAgent: true,
    hasPromptBoundary: true,
    hasUntrustedTrigger: false,
    hasPermissionBlock: false,
    hasBroadPermission: false,
    hasSecret: false,
    config,
    suppressions,
    invalidSuppressions,
    suppressedFindings: [],
    findings: [],
    seen: new Set()
  };

  detectInvalidSuppressions(context);
  detectRiskyAgentInstructions(context);
  return context.findings;
}

export function scanMcpConfigText(text, file = '.mcp.json', root = process.cwd(), config = {}) {
  const lines = text.split(/\r?\n/);
  const { suppressions, invalidSuppressions } = collectSuppressions(lines, config.suppressions || {});
  const context = {
    file,
    relativeFile: path.isAbsolute(file) ? path.relative(root, file) || path.basename(file) : file,
    lines,
    runBlocks: new Set(),
    triggers: new Set(),
    hasAgent: true,
    hasPromptBoundary: true,
    hasUntrustedTrigger: false,
    hasPermissionBlock: false,
    hasBroadPermission: false,
    hasSecret: false,
    config,
    suppressions,
    invalidSuppressions,
    suppressedFindings: [],
    findings: [],
    seen: new Set()
  };

  detectInvalidSuppressions(context);

  const parsed = parseJsonConfig(text);
  if (!parsed.ok) return context.findings;

  detectMcpConfigRisks(context, parsed.value);
  return context.findings;
}

export function classifyScanFile(file, root = process.cwd()) {
  if (isMcpConfigFile(file, root)) return 'mcp-config';
  if (isAgentInstructionFile(file, root)) return 'agent-context';
  if (workflowExtensions.has(path.extname(file))) return 'github-workflow';
  return 'other';
}

function scanFile(file, root, config) {
  const text = fs.readFileSync(file, 'utf8');
  let findings;
  if (isAgentInstructionFile(file, root)) {
    findings = scanAgentInstructionText(text, file, root, config);
  } else if (isMcpConfigFile(file, root)) {
    findings = scanMcpConfigText(text, file, root, config);
  } else {
    findings = scanWorkflowText(text, file, root, config);
  }
  return [...findings, ...detectFilePolicy(file, root, config)];
}

function discoverScanFiles(root) {
  if (!fs.existsSync(root)) {
    throw new Error(`path does not exist: ${root}`);
  }

  const stat = fs.statSync(root);
  if (stat.isFile()) {
    return (
      workflowExtensions.has(path.extname(root)) ||
      isAgentInstructionFile(root, path.dirname(root)) ||
      isMcpConfigFile(root, path.dirname(root))
    )
      ? [root]
      : [];
  }

  const files = [];
  const workflowDir = path.join(root, '.github', 'workflows');
  if (fs.existsSync(workflowDir)) {
    files.push(...walk(workflowDir).filter((file) => workflowExtensions.has(path.extname(file))));
  }

  files.push(...discoverAgentInstructionFiles(root));
  files.push(...discoverMcpConfigFiles(root));
  return [...new Set(files)].sort();
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

function detectInvalidSuppressions(context) {
  context.invalidSuppressions.forEach((suppression) => {
    addFinding(context, 'AWG011', suppression.line, {
      evidence: suppression.evidence,
      message: suppression.message
    });
  });
}

function detectRiskyAgentInstructions(context) {
  context.lines.forEach((line, index) => {
    if (isDefensiveInstructionLine(line)) return;

    if (riskyAgentInstructionPattern.test(line)) {
      addFinding(context, 'AWG012', index + 1, {
        evidence: line.trim(),
        message: 'A persistent agent instruction appears to weaken approval or permission boundaries.'
      });
      return;
    }

    if (untrustedCommandInstructionPattern.test(line)) {
      addFinding(context, 'AWG012', index + 1, {
        evidence: line.trim(),
        message: 'A persistent agent instruction appears to tell agents to treat untrusted GitHub text as commands.'
      });
      return;
    }

    if (secretExposureInstructionPattern.test(line)) {
      addFinding(context, 'AWG012', index + 1, {
        severity: 'critical',
        evidence: line.trim(),
        message: 'A persistent agent instruction appears to allow secrets or credentials to be exposed.'
      });
    }
  });
}

function detectMcpConfigRisks(context, config) {
  const servers = collectMcpServers(config);

  for (const server of servers) {
    detectMutableMcpServer(context, server);
    detectMcpSecretMaterial(context, server);
    detectMcpPolicy(context, server);
  }
}

function detectMutableMcpServer(context, server) {
  const command = stringValue(server.config.command);
  const args = arrayOfStrings(server.config.args);
  const baseCommand = normalizeCommand(command);
  const evidence = renderMcpCommandEvidence(server, command, args);

  if (mcpShellCommands.has(baseCommand)) {
    addFinding(context, 'AWG013', locateMcpLine(context, server, command), {
      evidence,
      message: 'A project-scoped MCP server starts through a shell interpreter.'
    });
    return;
  }

  if (args.some((arg) => /\bcurl\b.+\|\s*(?:bash|sh)\b|\b(?:bash|sh)\s+-c\b/i.test(arg))) {
    addFinding(context, 'AWG013', locateMcpLine(context, server, args.join(' ')), {
      evidence,
      message: 'A project-scoped MCP server uses a shell execution pattern in its arguments.'
    });
    return;
  }

  const packageSpec = findMcpPackageSpec(baseCommand, args);
  if (packageSpec && isMutablePackageSpec(packageSpec)) {
    addFinding(context, 'AWG013', locateMcpLine(context, server, packageSpec), {
      evidence,
      message: `MCP server "${server.name}" starts from a mutable package spec: ${packageSpec}.`
    });
  }

  const dockerImage = findDockerImageSpec(baseCommand, args);
  if (dockerImage && isMutableDockerImage(dockerImage)) {
    addFinding(context, 'AWG013', locateMcpLine(context, server, dockerImage), {
      evidence,
      message: `MCP server "${server.name}" starts from a mutable container image: ${dockerImage}.`
    });
  }
}

function detectMcpSecretMaterial(context, server) {
  const secretLocations = [];
  collectSecretLocations(server.config.env, ['env'], secretLocations);
  collectSecretLocations(server.config.headers, ['headers'], secretLocations);
  collectSecretLocations(server.config.oauth, ['oauth'], secretLocations);
  collectSecretArgs(arrayOfStrings(server.config.args), secretLocations);

  for (const location of secretLocations) {
    addFinding(context, 'AWG014', locateMcpLine(context, server, location.value || location.key), {
      evidence: `MCP server "${server.name}" ${location.path}: ${redactSecretEvidence(location.value)}`,
      message: `MCP server "${server.name}" appears to hardcode secret or authorization material.`
    });
  }
}

function detectMcpPolicy(context, server) {
  const policy = context.config.policy || {};
  const command = normalizeCommand(stringValue(server.config.command));
  const args = arrayOfStrings(server.config.args);
  const packageSpec = findMcpPackageSpec(command, args);

  if (policy.approvedMcpServers?.length > 0 && !policy.approvedMcpServers.includes(server.name)) {
    addFinding(context, 'AWG015', locateMcpLine(context, server, server.name), {
      evidence: `MCP server "${server.name}"`,
      message: `MCP server "${server.name}" is not listed in policy.approvedMcpServers.`
    });
  }

  if (policy.approvedMcpCommands?.length > 0 && command && !policy.approvedMcpCommands.includes(command)) {
    addFinding(context, 'AWG015', locateMcpLine(context, server, command), {
      evidence: `MCP server "${server.name}" command: ${command}`,
      message: `MCP server "${server.name}" uses a command not listed in policy.approvedMcpCommands.`
    });
  }

  if (policy.approvedMcpPackages?.length > 0 && packageSpec && !policy.approvedMcpPackages.includes(packageSpec)) {
    addFinding(context, 'AWG015', locateMcpLine(context, server, packageSpec), {
      evidence: `MCP server "${server.name}" package: ${packageSpec}`,
      message: `MCP server "${server.name}" uses a package not listed in policy.approvedMcpPackages.`
    });
  }
}

function detectFilePolicy(file, root, config) {
  const policy = config.policy || {};
  if (!policy.approvedFiles || policy.approvedFiles.length === 0) return [];

  const relativeFile = path.relative(root, file).split(path.sep).join('/') || path.basename(file);
  if (matchesAnyPolicyPattern(relativeFile, policy.approvedFiles)) return [];

  const context = createPolicyContext(file, root, config);
  addFinding(context, 'AWG015', 1, {
    evidence: relativeFile,
    message: `${relativeFile} is an agentic surface that is not listed in policy.approvedFiles.`
  });
  return context.findings;
}

function createPolicyContext(file, root, config) {
  return {
    file,
    relativeFile: path.isAbsolute(file) ? path.relative(root, file) || path.basename(file) : file,
    lines: [],
    runBlocks: new Set(),
    triggers: new Set(),
    hasAgent: true,
    hasPromptBoundary: true,
    hasUntrustedTrigger: false,
    hasPermissionBlock: false,
    hasBroadPermission: false,
    hasSecret: false,
    config,
    suppressions: new Map(),
    invalidSuppressions: [],
    suppressedFindings: [],
    findings: [],
    seen: new Set()
  };
}

function addFinding(context, ruleId, line, overrides = {}) {
  const docs = ruleCatalog[ruleId];
  const ruleConfig = context.config.rules?.[ruleId];
  if (ruleConfig?.enabled === false) return;

  const key = `${ruleId}:${line}:${overrides.evidence || ''}`;
  if (context.seen.has(key)) return;
  context.seen.add(key);

  const finding = {
    ruleId,
    title: docs.title,
    severity: ruleConfig?.severity || overrides.severity || docs.severity,
    file: context.relativeFile,
    absoluteFile: context.file,
    line,
    message: overrides.message || docs.title,
    evidence: overrides.evidence || '',
    suggestion: overrides.suggestion || docs.suggestion
  };

  const suppression = ruleId === 'AWG011' ? null : findSuppression(context, ruleId, line);
  if (suppression) {
    context.suppressedFindings.push({
      ...finding,
      suppressionReason: suppression.reason
    });
    return;
  }

  context.findings.push({
    ...finding,
    fingerprint: findingFingerprint(finding),
    baselineState: 'new'
  });
}

function collectSuppressions(lines, rawSuppressionConfig = {}) {
  const suppressionConfig = {
    allow: rawSuppressionConfig.allow !== false,
    allowedRules: rawSuppressionConfig.allowedRules || [],
    minimumReasonLength: rawSuppressionConfig.minimumReasonLength || 10
  };
  const suppressions = new Map();
  const invalidSuppressions = [];

  lines.forEach((line, index) => {
    const match = line.match(suppressionPattern);
    if (!match) return;

    const parsed = parseSuppression(match, line, index + 1, suppressionConfig);
    if (!parsed.valid) {
      invalidSuppressions.push(parsed);
      return;
    }

    const existing = suppressions.get(parsed.targetLine) || [];
    existing.push(parsed);
    suppressions.set(parsed.targetLine, existing);
  });

  return { suppressions, invalidSuppressions };
}

function parseSuppression(match, line, lineNumber, suppressionConfig) {
  const mode = match[1].toLowerCase();
  const rest = match[2].trim();
  const separatorIndex = rest.indexOf('--');
  const ruleText = separatorIndex === -1 ? rest : rest.slice(0, separatorIndex).trim();
  const reason = separatorIndex === -1 ? '' : rest.slice(separatorIndex + 2).trim();
  const rules = ruleText ? ruleText.split(/[,\s]+/).filter(Boolean).map((rule) => rule.toUpperCase()) : ['*'];
  const targetLine = mode === 'next-line' ? lineNumber + 1 : lineNumber;
  const evidence = line.trim();

  if (suppressionConfig.allow === false) {
    return {
      valid: false,
      line: lineNumber,
      evidence,
      message: 'Suppression comments are disabled by configuration.'
    };
  }

  if (!reason || reason.length < suppressionConfig.minimumReasonLength) {
    return {
      valid: false,
      line: lineNumber,
      evidence,
      message: 'Suppression comments must include a clear justification after --.'
    };
  }

  const invalidRule = rules.find((rule) => rule !== '*' && !ruleCatalog[rule]);
  if (invalidRule) {
    return {
      valid: false,
      line: lineNumber,
      evidence,
      message: `Suppression references unknown rule id: ${invalidRule}.`
    };
  }

  if (suppressionConfig.allowedRules?.length > 0) {
    if (rules.includes('*')) {
      return {
        valid: false,
        line: lineNumber,
        evidence,
        message: 'Wildcard suppression is not allowed by configuration.'
      };
    }

    const disallowedRule = rules.find((rule) => !suppressionConfig.allowedRules.includes(rule));
    if (disallowedRule) {
      return {
        valid: false,
        line: lineNumber,
        evidence,
        message: `Suppression for ${disallowedRule} is not allowed by configuration.`
      };
    }
  }

  return {
    valid: true,
    line: lineNumber,
    targetLine,
    rules,
    reason,
    evidence
  };
}

function findSuppression(context, ruleId, line) {
  const candidates = context.suppressions.get(line) || [];
  return candidates.find((suppression) => suppression.rules.includes('*') || suppression.rules.includes(ruleId));
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

function discoverAgentInstructionFiles(root) {
  const files = [];

  for (const relativeFile of agentInstructionFiles) {
    const file = path.join(root, relativeFile);
    if (fs.existsSync(file) && fs.statSync(file).isFile()) files.push(file);
  }

  const githubInstructionsDir = path.join(root, '.github', 'instructions');
  if (fs.existsSync(githubInstructionsDir)) {
    files.push(...walk(githubInstructionsDir).filter((file) => file.endsWith('.instructions.md')));
  }

  const githubAgentsDir = path.join(root, '.github', 'agents');
  if (fs.existsSync(githubAgentsDir)) {
    files.push(...walk(githubAgentsDir).filter((file) => file.endsWith('.md')));
  }

  const githubPromptsDir = path.join(root, '.github', 'prompts');
  if (fs.existsSync(githubPromptsDir)) {
    files.push(...walk(githubPromptsDir).filter((file) => file.endsWith('.prompt.md')));
  }

  const githubSkillsDir = path.join(root, '.github', 'skills');
  if (fs.existsSync(githubSkillsDir)) {
    files.push(...walk(githubSkillsDir).filter((file) => path.basename(file).toLowerCase() === 'skill.md'));
  }

  const cursorRulesDir = path.join(root, '.cursor', 'rules');
  if (fs.existsSync(cursorRulesDir)) {
    files.push(...walk(cursorRulesDir).filter((file) => ['.md', '.mdc', '.txt'].includes(path.extname(file))));
  }

  return files;
}

function discoverMcpConfigFiles(root) {
  const files = [];

  for (const relativeFile of mcpConfigFiles) {
    const file = path.join(root, relativeFile);
    if (fs.existsSync(file) && fs.statSync(file).isFile()) files.push(file);
  }

  return files;
}

function isAgentInstructionFile(file, root) {
  const relativeFile = path.relative(root, file).split(path.sep).join('/');
  const normalizedFile = file.split(path.sep).join('/');
  return (
    agentInstructionFiles.has(relativeFile) ||
    agentInstructionFiles.has(path.basename(file)) ||
    /\/\.github\/copilot-instructions\.md$/i.test(normalizedFile) ||
    /^\.github\/instructions\/.+\.instructions\.md$/i.test(relativeFile) ||
    /\/\.github\/instructions\/.+\.instructions\.md$/i.test(normalizedFile) ||
    /^\.github\/agents\/.+\.md$/i.test(relativeFile) ||
    /\/\.github\/agents\/.+\.md$/i.test(normalizedFile) ||
    /^\.github\/prompts\/.+\.prompt\.md$/i.test(relativeFile) ||
    /\/\.github\/prompts\/.+\.prompt\.md$/i.test(normalizedFile) ||
    /^\.github\/skills\/.+\/skill\.md$/i.test(relativeFile) ||
    /\/\.github\/skills\/.+\/skill\.md$/i.test(normalizedFile) ||
    /^\.cursor\/rules\/.+\.(?:md|mdc|txt)$/i.test(relativeFile) ||
    /\/\.cursor\/rules\/.+\.(?:md|mdc|txt)$/i.test(normalizedFile)
  );
}

function isMcpConfigFile(file, root) {
  const relativeFile = path.relative(root, file).split(path.sep).join('/');
  const normalizedFile = file.split(path.sep).join('/');
  return (
    mcpConfigFiles.has(relativeFile) ||
    /(?:^|\/)\.mcp\.json$/i.test(normalizedFile) ||
    /(?:^|\/)mcp\.json$/i.test(normalizedFile) ||
    /(?:^|\/)mcp_config\.json$/i.test(normalizedFile) ||
    /(?:^|\/)cline_mcp_settings\.json$/i.test(normalizedFile) ||
    /(?:^|\/)claude_desktop_config\.json$/i.test(normalizedFile)
  );
}

function isDefensiveInstructionLine(line) {
  const trimmed = line.trim().replace(/^[-*]\s*/, '');
  if (/^(?:never|do not|don't)\s+ask\b/i.test(trimmed)) return false;
  return /^(?:do not|don't|avoid|refuse|must not|should not|never use|disable)\b/i.test(trimmed);
}

function parseJsonConfig(text) {
  try {
    return { ok: true, value: JSON.parse(stripJsonCommentsAndTrailingCommas(text)) };
  } catch (error) {
    return { ok: false, error };
  }
}

function stripJsonCommentsAndTrailingCommas(text) {
  let output = '';
  let inString = false;
  let escaping = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
        output += char;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (inString) {
      output += char;
      if (escaping) {
        escaping = false;
      } else if (char === '\\') {
        escaping = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      output += char;
      continue;
    }

    if (char === '/' && next === '/') {
      inLineComment = true;
      index += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      inBlockComment = true;
      index += 1;
      continue;
    }

    output += char;
  }

  return removeTrailingCommas(output);
}

function removeTrailingCommas(text) {
  let output = '';
  let inString = false;
  let escaping = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      output += char;
      if (escaping) {
        escaping = false;
      } else if (char === '\\') {
        escaping = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      output += char;
      continue;
    }

    if (char === ',') {
      const rest = text.slice(index + 1);
      if (/^\s*[}\]]/.test(rest)) continue;
    }

    output += char;
  }

  return output;
}

function collectMcpServers(config) {
  const servers = [];
  collectMcpServerContainer(config?.mcpServers, 'mcpServers', servers);
  collectMcpServerContainer(config?.servers, 'servers', servers);

  if (isPlainObject(config?.projects)) {
    for (const [project, projectConfig] of Object.entries(config.projects)) {
      collectMcpServerContainer(projectConfig?.mcpServers, `projects.${project}.mcpServers`, servers);
    }
  }

  return servers;
}

function collectMcpServerContainer(container, source, servers) {
  if (!isPlainObject(container)) return;

  for (const [name, serverConfig] of Object.entries(container)) {
    if (!isPlainObject(serverConfig)) continue;
    servers.push({ name, source, config: serverConfig });
  }
}

function findMcpPackageSpec(baseCommand, args) {
  if (mcpPackageRunnerCommands.has(baseCommand)) {
    return args.find((arg) => isPackageLikeSpec(arg) && !arg.startsWith('-')) || '';
  }

  if (baseCommand === 'uv') {
    const fromIndex = args.indexOf('--from');
    if (fromIndex !== -1 && args[fromIndex + 1]) return args[fromIndex + 1];
    if (args[0] === 'tool' && ['run', 'install'].includes(args[1])) {
      return args.find((arg, index) => index > 1 && isPackageLikeSpec(arg) && !arg.startsWith('-')) || '';
    }
  }

  return '';
}

function isMutablePackageSpec(spec) {
  if (!spec || spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('${')) return false;
  if (/^(?:https?|git\+?ssh|git\+?https?):/i.test(spec)) return true;
  if (/@latest(?:$|[#?])/.test(spec)) return true;

  const atIndex = spec.startsWith('@') ? spec.indexOf('@', 1) : spec.indexOf('@');
  if (atIndex === -1) return true;

  const version = spec.slice(atIndex + 1);
  return version.length === 0 || version === 'latest';
}

function isPackageLikeSpec(spec) {
  if (!spec || spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('${')) return false;
  if (/^(?:https?|git\+?ssh|git\+?https?):/i.test(spec)) return true;
  return /^@?[\w.-]+(?:\/[\w.-]+)?(?:@[\w.*^~+-][\w.*^~+-]*)?$/.test(spec);
}

function findDockerImageSpec(baseCommand, args) {
  if (!['docker', 'podman'].includes(baseCommand)) return '';
  const runIndex = args.indexOf('run');
  if (runIndex === -1) return '';

  const optionsWithValues = new Set([
    '-e',
    '--env',
    '--env-file',
    '-v',
    '--volume',
    '-p',
    '--publish',
    '--name',
    '--network',
    '-w',
    '--workdir'
  ]);

  for (let index = runIndex + 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--') continue;
    if (optionsWithValues.has(arg)) {
      index += 1;
      continue;
    }
    if (arg.startsWith('--') && arg.includes('=')) continue;
    if (arg.startsWith('-')) continue;
    return arg;
  }

  return '';
}

function isMutableDockerImage(image) {
  if (!image || image.startsWith('${')) return false;
  if (image.includes('@sha256:')) return false;

  const lastSlash = image.lastIndexOf('/');
  const lastColon = image.lastIndexOf(':');
  if (lastColon <= lastSlash) return true;
  return image.slice(lastColon + 1) === 'latest';
}

function collectSecretLocations(value, pathParts, locations) {
  if (!isPlainObject(value)) return;

  for (const [key, child] of Object.entries(value)) {
    const childPath = [...pathParts, key];
    if (typeof child === 'string') {
      if ((mcpSecretKeyPattern.test(key) && isLiteralSecretValue(child)) || mcpSecretValuePattern.test(child)) {
        locations.push({ key, value: child, path: childPath.join('.') });
      }
      continue;
    }

    collectSecretLocations(child, childPath, locations);
  }
}

function collectSecretArgs(args, locations) {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (mcpSecretFlagPattern.test(arg)) {
      const value = arg.includes('=') ? arg.slice(arg.indexOf('=') + 1) : args[index + 1] || '';
      if (isLiteralSecretValue(value)) {
        locations.push({ key: arg, value, path: `args.${index}` });
      }
      continue;
    }

    if (/^(?:Authorization|Cookie):?\s*[:=]\s*/i.test(arg) && isLiteralSecretValue(arg)) {
      locations.push({ key: 'authorization', value: arg, path: `args.${index}` });
    }
  }
}

function isLiteralSecretValue(value) {
  const trimmed = String(value || '').trim();
  if (trimmed.length === 0) return false;
  if (/^\$\{(?:(?:input|env):)?[\w.-]+(?::-.*)?}$/i.test(trimmed)) return false;
  if (/^\$\{\{\s*secrets\.[\w.-]+\s*}}$/i.test(trimmed)) return false;
  if (/^\$[A-Z_][A-Z0-9_]*$/i.test(trimmed)) return false;
  if (mcpSecretValuePattern.test(trimmed)) return true;
  return trimmed.length >= 8 && !/^(?:true|false|null|none|undefined)$/i.test(trimmed);
}

function redactSecretEvidence(value) {
  const text = String(value || '');
  if (text.length <= 6) return '[redacted]';
  return `${text.slice(0, 3)}...[redacted]`;
}

function renderMcpCommandEvidence(server, command, args) {
  return `MCP server "${server.name}": ${[command, ...args].filter(Boolean).join(' ')}`;
}

function locateMcpLine(context, server, needle) {
  const needles = [needle, server.name, server.source].filter(Boolean).map(String);

  for (const candidate of needles) {
    const line = locateLine(context.lines, candidate);
    if (line !== -1) return line;
  }

  return 1;
}

function locateLine(lines, needle) {
  const escapedNeedle = JSON.stringify(needle).slice(1, -1);
  const index = lines.findIndex((line) => line.includes(needle) || line.includes(escapedNeedle));
  return index === -1 ? -1 : index + 1;
}

function stringValue(value) {
  return typeof value === 'string' ? value : '';
}

function arrayOfStrings(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

function normalizeCommand(command) {
  return path.basename(String(command || '')).replace(/\.(?:exe|cmd|bat)$/i, '').toLowerCase();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function matchesAnyPolicyPattern(value, patterns) {
  return patterns.some((pattern) => wildcardToRegExp(pattern).test(value));
}

function wildcardToRegExp(pattern) {
  const escaped = String(pattern)
    .split('*')
    .map((part) => escapeRegex(part))
    .join('.*');
  return new RegExp(`^${escaped}$`);
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
