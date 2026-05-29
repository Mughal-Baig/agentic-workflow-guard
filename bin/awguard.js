#!/usr/bin/env node

import { runCli } from '../src/cli.js';

runCli(process.argv.slice(2), process.env).catch((error) => {
  console.error(`awguard: ${error.message}`);
  process.exitCode = 2;
});
