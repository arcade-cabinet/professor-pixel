#!/usr/bin/env node

// Test runner script for TypeScript-Python pygame builder
const { spawn } = require('child_process');

const args = process.argv.slice(2);
const command = args[0] || 'help';

const commands = {
  unit: () => runCommand('npx', ['vitest', 'run']),
  ui: () => runCommand('npx', ['vitest', '--ui']),
  coverage: () => runCommand('npx', ['vitest', 'run', '--coverage']),
  e2e: () => runCommand('npx', ['playwright', 'test']),
  all: async () => {
    console.log('Running all tests...\n');
    await runCommand('npx', ['vitest', 'run', '--coverage']);
    console.log('\nRunning E2E tests...\n');
    await runCommand('npx', ['playwright', 'test']);
  },
  help: () => {
    console.log(`
TypeScript-Python Pygame Builder Test Suite
===========================================

Usage: node run-tests.js [command]

Commands:
  unit      - Run unit tests
  ui        - Open test UI  
  coverage  - Run tests with coverage report
  e2e       - Run end-to-end tests
  all       - Run all tests

Example: node run-tests.js unit
`);
  },
};

function runCommand(cmd, args) {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { stdio: 'inherit', shell: true });
    proc.on('close', (code) => {
      resolve(code);
    });
  });
}

const run = commands[command];
if (run) {
  run();
} else {
  commands.help();
}
