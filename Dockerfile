FROM node:20-alpine

WORKDIR /app
COPY package.json README.md LICENSE action.yml ./
COPY bin ./bin
COPY src ./src

ENTRYPOINT ["node", "/app/bin/awguard.js"]
