export const templateNames = ['github', 'code-scanning', 'gitlab', 'pre-commit', 'vscode'];

export function renderTemplates(name = 'all', { actionRef = 'v0' } = {}) {
  const normalized = String(name || 'all').toLowerCase();
  if (normalized === 'list') return renderTemplateList();
  if (normalized === 'all') {
    return templateNames.map((templateName) => renderOneTemplate(templateName, actionRef)).join('\n\n---\n\n');
  }
  if (!templateNames.includes(normalized)) {
    throw new Error(`unknown template: ${name}. Available templates: all, ${templateNames.join(', ')}`);
  }
  return renderOneTemplate(normalized, actionRef);
}

function renderTemplateList() {
  return ['Available AWGuard templates:', ...templateNames.map((name) => `- ${name}`), '- all'].join('\n');
}

function renderOneTemplate(name, actionRef) {
  const template = buildTemplates(actionRef)[name];
  return [`# ${template.title}`, '', template.description, '', '```' + template.fence, template.body.trim(), '```'].join('\n');
}

function buildTemplates(actionRef) {
  return {
    github: {
      title: 'GitHub Actions Check',
      description: 'Use this for fast pull request feedback with GitHub annotations and a job summary.',
      fence: 'yaml',
      body: `
name: Agentic Workflow Guard

on:
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  awguard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: Mughal-Baig/agentic-workflow-guard@${actionRef}
        with:
          preset: strict
          fail-on: high
`
    },
    'code-scanning': {
      title: 'GitHub Code Scanning',
      description: 'Use this when you want AWGuard findings in GitHub code scanning/SARIF.',
      fence: 'yaml',
      body: `
name: Agentic Workflow Guard Code Scanning

on:
  push:
  schedule:
    - cron: '22 5 * * 1'
  workflow_dispatch:

permissions:
  contents: read
  security-events: write

jobs:
  awguard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: Mughal-Baig/agentic-workflow-guard@${actionRef}
        with:
          preset: strict
          format: sarif
          output: awguard.sarif
          fail-on: none
      - uses: github/codeql-action/upload-sarif@v4
        if: always()
        with:
          sarif_file: awguard.sarif
          category: agentic-workflow-guard
`
    },
    gitlab: {
      title: 'GitLab CI',
      description: 'Use this in GitLab projects that run Node.js jobs.',
      fence: 'yaml',
      body: `
awguard:
  image: node:22-alpine
  stage: test
  script:
    - npx awguard@latest . --preset strict --format text --fail-on high
`
    },
    'pre-commit': {
      title: 'pre-commit Hook',
      description: 'Use this to catch risky agent workflow changes before commit.',
      fence: 'yaml',
      body: `
repos:
  - repo: local
    hooks:
      - id: awguard
        name: Agentic Workflow Guard
        entry: npx awguard@latest . --preset strict --fail-on high
        language: system
        pass_filenames: false
`
    },
    vscode: {
      title: 'VS Code Task',
      description: 'Use this to run AWGuard from the VS Code task picker.',
      fence: 'json',
      body: `
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "AWGuard scan",
      "type": "shell",
      "command": "npx awguard@latest . --preset strict --format text --fail-on none",
      "problemMatcher": []
    }
  ]
}
`
    }
  };
}
