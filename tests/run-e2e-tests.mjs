#!/usr/bin/env node
// tests/run-e2e-tests.mjs
// Automated E2E & Architectural Test Runner for VitalRoot Refactoring & Optimization

import { registry } from './helpers/test-harness.mjs';
import { registerTier1Tests } from './tier1-features.test.mjs';
import { registerTier2Tests } from './tier2-boundary.test.mjs';
import { registerTier3Tests } from './tier3-combinations.test.mjs';
import { registerTier4Tests } from './tier4-scenarios.test.mjs';

// Parse command line arguments
const args = process.argv.slice(2);
let tierArg = 'all';
let filterArg = null;
let jsonMode = false;
let bailMode = false;
let summaryMode = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--tier' && i + 1 < args.length) {
    tierArg = args[++i].toLowerCase();
  } else if (arg.startsWith('--tier=')) {
    tierArg = arg.split('=')[1].toLowerCase();
  } else if (arg === '--filter' && i + 1 < args.length) {
    filterArg = args[++i];
  } else if (arg === '--json') {
    jsonMode = true;
  } else if (arg === '--bail') {
    bailMode = true;
  } else if (arg === '--summary') {
    summaryMode = true;
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
VitalRoot E2E Automated Test Runner

Usage:
  node tests/run-e2e-tests.mjs [options]

Options:
  --tier <1|2|3|4|all>   Execute specific tier (default: all)
  --filter <pattern>     Run only tests matching pattern
  --bail                 Stop execution immediately on first failure
  --json                 Output test results as machine-readable JSON
  --summary              Show concise summary only
  --help, -h             Display this help message
`);
    process.exit(0);
  }
}

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  magenta: '\x1b[35m',
};

async function main() {
  if (!jsonMode) {
    console.log(`\n${colors.bold}${colors.cyan}====================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}  VitalRoot Automated E2E & Architectural Test Suite  ${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}`);
    console.log(`Running Tier(s): ${colors.bold}${tierArg.toUpperCase()}${colors.reset}\n`);
  }

  // Register requested tiers
  registry.clear();

  if (tierArg === '1' || tierArg === 'all') {
    registerTier1Tests();
  }
  if (tierArg === '2' || tierArg === 'all') {
    registerTier2Tests();
  }
  if (tierArg === '3' || tierArg === 'all') {
    registerTier3Tests();
  }
  if (tierArg === '4' || tierArg === 'all') {
    registerTier4Tests();
  }

  // Execute registered tests
  const results = await registry.run({
    silent: jsonMode || summaryMode,
    bail: bailMode,
    filter: filterArg,
  });

  if (jsonMode) {
    console.log(JSON.stringify(results, null, 2));
    process.exit(results.failed > 0 ? 1 : 0);
  }

  // Print Summary Table
  console.log(`\n${colors.bold}----------------------------------------------------${colors.reset}`);
  console.log(`${colors.bold} Test Results Summary${colors.reset}`);
  console.log(`${colors.bold}----------------------------------------------------${colors.reset}`);

  for (const suite of results.suites) {
    const total = suite.tests.length;
    const passSymbol = suite.failed === 0 ? `${colors.green}PASS${colors.reset}` : `${colors.red}FAIL${colors.reset}`;
    console.log(
      `  [${passSymbol}] ${suite.name}: ${colors.green}${suite.passed} passed${colors.reset}, ${
        suite.failed > 0 ? `${colors.red}${suite.failed} failed${colors.reset}` : '0 failed'
      } (total ${total})`
    );
  }

  console.log(`${colors.bold}----------------------------------------------------${colors.reset}`);
  console.log(
    `Total Tests: ${results.total} | ${colors.green}Passed: ${results.passed}${colors.reset} | ${
      results.failed > 0 ? `${colors.red}Failed: ${results.failed}${colors.reset}` : 'Failed: 0'
    } | Skipped: ${results.skipped} | Duration: ${results.durationMs}ms`
  );

  if (results.failed === 0) {
    console.log(`\n${colors.bold}${colors.green}🎉 ALL TESTS PASSED SUCCESSFULLY!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.bold}${colors.red}❌ SOME TESTS FAILED. See details above.${colors.reset}\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
