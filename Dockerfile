FROM node:24-alpine

LABEL org.opencontainers.image.title="Agentic Workflow Guard"
LABEL org.opencontainers.image.description="Scan GitHub Actions workflows, agent instructions, and MCP configs for agentic workflow risk."
LABEL org.opencontainers.image.source="https://github.com/Mughal-Baig/agentic-workflow-guard"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app
COPY package.json README.md LICENSE action.yml ./
COPY bin ./bin
COPY src ./src
RUN chmod +x /app/bin/awguard.js && ln -s /app/bin/awguard.js /usr/local/bin/awguard

WORKDIR /repo
ENTRYPOINT ["node", "/app/bin/awguard.js"]
