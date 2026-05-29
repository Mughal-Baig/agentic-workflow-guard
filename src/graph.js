const sourcePattern = /github\.(?:event\.[\w.-]+\.)?(body|default_branch|email|head_ref|label|message|name|page_name|ref|title)|\${{\s*github\.(?:event\.[\w.-]+\.)?([\w.-]+)\s*}}/i;

const impactByRule = {
  AWG001: 'Agent follows attacker-controlled instructions',
  AWG002: 'Shell executes attacker-controlled workflow text',
  AWG003: 'Untrusted pull request code runs with privileged context',
  AWG004: 'Agent or script can write to repository resources',
  AWG005: 'Model provider or repository secret may be exposed',
  AWG006: 'Autonomous agent can act without review',
  AWG007: 'Model output can become executable code',
  AWG008: 'Default token permissions may be broader than intended',
  AWG009: 'Untrusted artifacts can influence privileged jobs',
  AWG010: 'Mutable third-party action can change behavior',
  AWG011: 'Suppression policy can hide real risk'
};

export function buildAttackGraphs(result) {
  const findings = result.findings.filter((finding) => finding.ruleId !== 'AWG011');
  const byFile = groupBy(findings, (finding) => finding.file);

  const graphs = [...byFile.entries()].map(([file, fileFindings]) => {
    const authorities = inferAuthorities(fileFindings);
    return {
      file,
      findings: fileFindings,
      authorities,
      chains: fileFindings.map((finding) => buildChain(finding, authorities))
    };
  });

  return {
    graphs,
    summary: {
      files: graphs.length,
      chains: graphs.reduce((total, graph) => total + graph.chains.length, 0)
    }
  };
}

export function renderGraphMarkdown(result) {
  const attackGraph = buildAttackGraphs(result);
  const lines = [
    '# Agentic Workflow Guard Attack Graph',
    '',
    `Scanned workflow files: **${result.scannedFiles.length}**`,
    `Findings: **${result.summary.total}**`,
    `Attack chains: **${attackGraph.summary.chains}**`,
    ''
  ];

  if (attackGraph.summary.chains === 0) {
    lines.push('No attack chains found.');
    return lines.join('\n');
  }

  for (const graph of attackGraph.graphs) {
    lines.push(`## ${graph.file}`);
    lines.push('');
    lines.push('```mermaid');
    lines.push(renderMermaidForGraph(graph));
    lines.push('```');
    lines.push('');

    for (const chain of graph.chains) {
      lines.push(`- **${chain.ruleId} ${chain.severity}** at \`${chain.location}\`: ${chain.impact}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function renderHtmlReport(result) {
  const attackGraph = buildAttackGraphs(result);
  const findingRows = result.findings
    .map(
      (finding) => `<tr>
        <td><span class="severity ${escapeHtml(finding.severity)}">${escapeHtml(finding.severity)}</span></td>
        <td>${escapeHtml(finding.ruleId)}</td>
        <td><code>${escapeHtml(`${finding.file}:${finding.line}`)}</code></td>
        <td>${escapeHtml(finding.title)}</td>
        <td>${escapeHtml(finding.suggestion)}</td>
      </tr>`
    )
    .join('\n');

  const graphSections = attackGraph.graphs
    .map(
      (graph) => `<section class="graph">
        <h2>${escapeHtml(graph.file)}</h2>
        ${graph.chains
          .map(
            (chain) => `<div class="chain">
              <div class="step"><span>Source</span><strong>${escapeHtml(chain.source)}</strong></div>
              <div class="arrow">→</div>
              <div class="step"><span>Boundary</span><strong>${escapeHtml(chain.boundary)}</strong></div>
              <div class="arrow">→</div>
              <div class="step"><span>Capability</span><strong>${escapeHtml(chain.capability)}</strong></div>
              <div class="arrow">→</div>
              <div class="step"><span>Authority</span><strong>${escapeHtml(chain.authority)}</strong></div>
              <div class="arrow">→</div>
              <div class="step impact"><span>Impact</span><strong>${escapeHtml(chain.impact)}</strong></div>
            </div>`
          )
          .join('\n')}
        <details>
          <summary>Mermaid source</summary>
          <pre class="mermaid">${escapeHtml(renderMermaidForGraph(graph))}</pre>
        </details>
        <ul>
          ${graph.chains
            .map(
              (chain) =>
                `<li><strong>${escapeHtml(chain.ruleId)}</strong> <code>${escapeHtml(
                  chain.location
                )}</code>: ${escapeHtml(chain.impact)}</li>`
            )
            .join('\n')}
        </ul>
      </section>`
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Agentic Workflow Guard Report</title>
  <style>
    :root { color-scheme: light; --ink: #172026; --muted: #53636f; --line: #d8e0e6; --panel: #f7fafc; --accent: #0f766e; }
    body { margin: 0; font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--ink); background: #ffffff; }
    header { padding: 40px 32px 28px; border-bottom: 1px solid var(--line); background: linear-gradient(180deg, #eef7f6, #ffffff); }
    main { padding: 28px 32px 48px; max-width: 1180px; margin: 0 auto; }
    h1 { margin: 0 0 8px; font-size: 34px; letter-spacing: 0; }
    h2 { margin-top: 30px; font-size: 22px; }
    .subtitle { margin: 0; color: var(--muted); max-width: 760px; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 24px 0; }
    .metric { border: 1px solid var(--line); background: var(--panel); border-radius: 8px; padding: 16px; }
    .metric strong { display: block; font-size: 28px; }
    table { width: 100%; border-collapse: collapse; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
    th, td { padding: 10px 12px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
    th { background: var(--panel); }
    code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    pre { overflow: auto; background: #101820; color: #e7f4f2; padding: 16px; border-radius: 8px; }
    .severity { display: inline-block; min-width: 64px; text-align: center; border-radius: 999px; color: #fff; font-size: 12px; padding: 2px 8px; text-transform: uppercase; }
    .critical { background: #b42318; } .high { background: #c2410c; } .medium { background: #a16207; } .low { background: #2563eb; }
    .graph { border: 1px solid var(--line); border-radius: 8px; padding: 18px; margin: 18px 0; }
    .chain { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr auto 1fr; gap: 8px; align-items: stretch; margin: 14px 0; }
    .step { border: 1px solid var(--line); border-top: 4px solid var(--accent); background: #fff; border-radius: 8px; padding: 10px; min-height: 82px; }
    .step span { display: block; color: var(--muted); font-size: 12px; text-transform: uppercase; }
    .step strong { display: block; margin-top: 5px; }
    .step.impact { border-top-color: #b42318; }
    .arrow { align-self: center; color: var(--accent); font-size: 24px; font-weight: 700; }
    details { margin: 12px 0; }
    @media (max-width: 980px) { .chain { grid-template-columns: 1fr; } .arrow { display: none; } }
  </style>
</head>
<body>
  <header>
    <h1>Agentic Workflow Guard</h1>
    <p class="subtitle">Attack graph report for AI-agent GitHub Actions workflows. It maps untrusted event text to prompts, agent capabilities, permissions, and possible impact.</p>
  </header>
  <main>
    <section class="metrics">
      <div class="metric"><span>Workflow files</span><strong>${result.scannedFiles.length}</strong></div>
      <div class="metric"><span>Findings</span><strong>${result.summary.total}</strong></div>
      <div class="metric"><span>Highest severity</span><strong>${escapeHtml(result.summary.highest)}</strong></div>
      <div class="metric"><span>Attack chains</span><strong>${attackGraph.summary.chains}</strong></div>
    </section>
    <h2>Attack Graphs</h2>
    ${graphSections || '<p>No attack chains found.</p>'}
    <h2>Findings</h2>
    <table>
      <thead><tr><th>Severity</th><th>Rule</th><th>Location</th><th>Finding</th><th>Suggested fix</th></tr></thead>
      <tbody>${findingRows}</tbody>
    </table>
  </main>
</body>
</html>`;
}

function buildChain(finding, authorities) {
  const source = inferSource(finding);
  const boundary = inferBoundary(finding);
  const capability = inferCapability(finding);
  const authority = authorities.length > 0 ? authorities.join(' + ') : inferAuthority(finding);
  const impact = impactByRule[finding.ruleId] || 'Workflow integrity risk';

  return {
    ruleId: finding.ruleId,
    severity: finding.severity,
    location: `${finding.file}:${finding.line}`,
    source,
    boundary,
    capability,
    authority,
    impact
  };
}

function inferAuthorities(findings) {
  const authorities = new Set();
  if (findings.some((finding) => finding.ruleId === 'AWG004')) authorities.add('write-capable GITHUB_TOKEN');
  if (findings.some((finding) => finding.ruleId === 'AWG005')) authorities.add('repository or provider secrets');
  if (findings.some((finding) => finding.ruleId === 'AWG003')) authorities.add('pull_request_target privileges');
  return [...authorities];
}

function inferSource(finding) {
  const match = finding.evidence.match(sourcePattern);
  if (match) return `GitHub event field: ${match[1] || match[2] || 'github context'}`;
  if (finding.ruleId === 'AWG009') return 'workflow_run artifact';
  if (finding.ruleId === 'AWG010') return 'third-party action ref';
  return 'workflow configuration';
}

function inferBoundary(finding) {
  if (finding.ruleId === 'AWG001') return 'AI agent prompt';
  if (finding.ruleId === 'AWG002') return 'run script interpolation';
  if (finding.ruleId === 'AWG003') return 'checkout of untrusted PR code';
  if (finding.ruleId === 'AWG007') return 'command execution sink';
  return 'workflow execution';
}

function inferCapability(finding) {
  if (finding.ruleId === 'AWG006') return 'autonomous agent tool use';
  if (finding.ruleId === 'AWG007' || finding.ruleId === 'AWG002') return 'shell command execution';
  if (finding.ruleId === 'AWG010') return 'third-party action execution';
  return 'CI runner and agent tools';
}

function inferAuthority(finding) {
  if (finding.ruleId === 'AWG004') return 'write-capable token';
  if (finding.ruleId === 'AWG005') return 'secret environment values';
  if (finding.ruleId === 'AWG008') return 'implicit token permissions';
  return 'workflow permissions';
}

function renderMermaidForGraph(graph) {
  const lines = ['flowchart LR'];

  graph.chains.forEach((chain, index) => {
    const prefix = `c${index}`;
    lines.push(`  ${prefix}s["${escapeMermaid(chain.source)}"]`);
    lines.push(`  ${prefix}b["${escapeMermaid(chain.boundary)}"]`);
    lines.push(`  ${prefix}c["${escapeMermaid(chain.capability)}"]`);
    lines.push(`  ${prefix}a["${escapeMermaid(chain.authority)}"]`);
    lines.push(`  ${prefix}i["${escapeMermaid(chain.impact)}"]`);
    lines.push(`  ${prefix}s --> ${prefix}b --> ${prefix}c --> ${prefix}a --> ${prefix}i`);
  });

  return lines.join('\n');
}

function groupBy(values, keyFn) {
  const groups = new Map();
  for (const value of values) {
    const key = keyFn(value);
    const group = groups.get(key) || [];
    group.push(value);
    groups.set(key, group);
  }
  return groups;
}

function escapeMermaid(value) {
  return String(value).replaceAll('"', '\\"');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
