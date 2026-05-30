export const policyPackNames = ['oss', 'strict', 'enterprise'];

export function renderPolicyPack(name = 'oss') {
  const normalized = String(name || 'oss').toLowerCase();
  if (normalized === 'list') return renderPolicyPackList();
  const pack = policyPacks[normalized];
  if (!pack) {
    throw new Error(`unknown policy pack: ${name}. Available policy packs: ${policyPackNames.join(', ')}`);
  }

  return [
    `# AWGuard Policy Pack: ${pack.title}`,
    '',
    pack.description,
    '',
    '```json',
    JSON.stringify(pack.config, null, 2),
    '```'
  ].join('\n');
}

function renderPolicyPackList() {
  return ['Available AWGuard policy packs:', ...policyPackNames.map((name) => `- ${name}`)].join('\n');
}

const schemaUrl =
  'https://raw.githubusercontent.com/Mughal-Baig/agentic-workflow-guard/main/schemas/awguard.config.schema.json';

const policyPacks = {
  oss: {
    title: 'Open Source Maintainer',
    description:
      'A practical starting point for public repositories that want visibility without too much friction.',
    config: {
      $schema: schemaUrl,
      extends: ['strict'],
      scan: {
        include: ['.github/workflows/*', 'AGENTS.md', '.github/agents/*', '.github/prompts/*', '.mcp.json'],
        exclude: ['node_modules/*', 'dist/*', 'build/*']
      },
      policy: {
        approvedFiles: ['AGENTS.md', '.github/workflows/*'],
        approvedMcpServers: [],
        approvedMcpPackages: [],
        approvedMcpCommands: ['node', 'npx', 'uvx', 'docker']
      },
      suppressions: {
        minimumReasonLength: 20
      }
    }
  },
  strict: {
    title: 'Strict Repository',
    description: 'A tighter pack for repositories where agentic surfaces should be reviewed before use.',
    config: {
      $schema: schemaUrl,
      extends: ['strict'],
      scan: {
        include: ['.github/workflows/*', 'AGENTS.md', 'CLAUDE.md', 'CODEX.md', '.github/**', '.mcp.json', '.vscode/mcp.json'],
        exclude: ['node_modules/*', 'dist/*', 'build/*', 'coverage/*']
      },
      policy: {
        approvedFiles: [],
        approvedMcpServers: [],
        approvedMcpPackages: [],
        approvedMcpCommands: []
      },
      suppressions: {
        allowedRules: [],
        minimumReasonLength: 30
      }
    }
  },
  enterprise: {
    title: 'Enterprise MCP Governance',
    description: 'A pack for organizations that want pinned MCP startup and explicit agent surface review.',
    config: {
      $schema: schemaUrl,
      extends: ['strict'],
      scan: {
        include: ['.github/workflows/*', 'AGENTS.md', 'CLAUDE.md', 'CODEX.md', '.github/**', '.cursor/**', '.mcp.json', '.vscode/mcp.json'],
        exclude: ['node_modules/*', 'vendor/*', 'dist/*', 'build/*', 'coverage/*']
      },
      policy: {
        approvedFiles: ['AGENTS.md'],
        approvedMcpServers: [],
        approvedMcpPackages: [],
        approvedMcpCommands: ['node', 'docker']
      },
      suppressions: {
        allowedRules: ['AWG010'],
        minimumReasonLength: 40
      }
    }
  }
};
