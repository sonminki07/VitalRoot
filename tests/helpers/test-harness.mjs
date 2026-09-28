// tests/helpers/test-harness.mjs
// Lightweight, zero-external-dependency test runner and assertion framework for VitalRoot E2E testing

import { performance } from 'node:perf_hooks';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
};

class AssertionError extends Error {
  constructor(message, actual, expected) {
    super(message);
    this.name = 'AssertionError';
    this.actual = actual;
    this.expected = expected;
  }
}

function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

export function expect(actual) {
  const matchers = (isNot = false) => ({
    toBe(expected) {
      const pass = Object.is(actual, expected);
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${JSON.stringify(actual)} ${isNot ? 'NOT to be' : 'to be'} ${JSON.stringify(expected)}`,
          actual,
          expected
        );
      }
    },

    toEqual(expected) {
      const pass = deepEqual(actual, expected);
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${JSON.stringify(actual)} ${isNot ? 'NOT to deeply equal' : 'to deeply equal'} ${JSON.stringify(expected)}`,
          actual,
          expected
        );
      }
    },

    toBeDefined() {
      const pass = actual !== undefined;
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected value ${isNot ? 'to be undefined' : 'to be defined'}, received ${typeof actual}`,
          actual,
          'defined'
        );
      }
    },

    toBeUndefined() {
      const pass = actual === undefined;
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected undefined, received ${JSON.stringify(actual)}`,
          actual,
          undefined
        );
      }
    },

    toBeNull() {
      const pass = actual === null;
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected null, received ${JSON.stringify(actual)}`,
          actual,
          null
        );
      }
    },

    toBeTruthy() {
      const pass = Boolean(actual);
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected truthy value, received ${JSON.stringify(actual)}`,
          actual,
          'truthy'
        );
      }
    },

    toBeFalsy() {
      const pass = !actual;
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected falsy value, received ${JSON.stringify(actual)}`,
          actual,
          'falsy'
        );
      }
    },

    toBeGreaterThan(expected) {
      const pass = actual > expected;
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${actual} ${isNot ? 'not to be >' : 'to be >'} ${expected}`,
          actual,
          expected
        );
      }
    },

    toBeGreaterThanOrEqual(expected) {
      const pass = actual >= expected;
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${actual} ${isNot ? 'not to be >=' : 'to be >='} ${expected}`,
          actual,
          expected
        );
      }
    },

    toBeLessThan(expected) {
      const pass = actual < expected;
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${actual} ${isNot ? 'not to be <' : 'to be <'} ${expected}`,
          actual,
          expected
        );
      }
    },

    toBeLessThanOrEqual(expected) {
      const pass = actual <= expected;
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${actual} ${isNot ? 'not to be <=' : 'to be <='} ${expected}`,
          actual,
          expected
        );
      }
    },

    toContain(expected) {
      let pass = false;
      if (typeof actual === 'string' || Array.isArray(actual)) {
        pass = actual.includes(expected);
      } else if (actual instanceof Set || actual instanceof Map) {
        pass = actual.has(expected);
      }
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${JSON.stringify(actual)} ${isNot ? 'NOT to contain' : 'to contain'} ${JSON.stringify(expected)}`,
          actual,
          expected
        );
      }
    },

    toMatch(pattern) {
      const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
      const str = String(actual);
      const pass = regex.test(str);
      if (isNot ? pass : !pass) {
        const preview = str.length > 80 ? str.slice(0, 80) + '... [truncated]' : str;
        throw new AssertionError(
          `Expected "${preview}" ${isNot ? 'NOT to match' : 'to match'} pattern ${pattern}`,
          actual,
          pattern
        );
      }
    },

    toThrow(expectedError) {
      let threw = false;
      let errorThrown = null;
      try {
        if (typeof actual === 'function') {
          actual();
        } else {
          throw new Error('Actual value must be a function to use toThrow');
        }
      } catch (err) {
        threw = true;
        errorThrown = err;
      }

      if (!isNot && !threw) {
        throw new AssertionError('Expected function to throw an error, but it did not');
      }
      if (isNot && threw) {
        throw new AssertionError(`Expected function NOT to throw, but it threw: ${errorThrown?.message}`);
      }

      if (threw && expectedError) {
        if (typeof expectedError === 'string') {
          if (!errorThrown.message.includes(expectedError)) {
            throw new AssertionError(
              `Expected error message to contain "${expectedError}", but got "${errorThrown.message}"`
            );
          }
        } else if (expectedError instanceof RegExp) {
          if (!expectedError.test(errorThrown.message)) {
            throw new AssertionError(
              `Expected error message to match ${expectedError}, but got "${errorThrown.message}"`
            );
          }
        }
      }
    },

    get not() {
      return matchers(true);
    },
  });

  return matchers(false);
}

export class TestRegistry {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
  }

  describe(name, fn) {
    const parentSuite = this.currentSuite;
    const suite = {
      name,
      tests: [],
      beforeEachFns: [],
      afterEachFns: [],
      parent: parentSuite,
    };
    if (parentSuite) {
      if (!parentSuite.childSuites) parentSuite.childSuites = [];
      parentSuite.childSuites.push(suite);
    } else {
      this.suites.push(suite);
    }

    this.currentSuite = suite;
    try {
      fn();
    } finally {
      this.currentSuite = parentSuite;
    }
  }

  test(name, fn, options = {}) {
    if (!this.currentSuite) {
      this.describe('Default Suite', () => {
        this.currentSuite.tests.push({ name, fn, options });
      });
    } else {
      this.currentSuite.tests.push({ name, fn, options });
    }
  }

  beforeEach(fn) {
    if (this.currentSuite) {
      this.currentSuite.beforeEachFns.push(fn);
    }
  }

  afterEach(fn) {
    if (this.currentSuite) {
      this.currentSuite.afterEachFns.push(fn);
    }
  }

  clear() {
    this.suites = [];
    this.currentSuite = null;
  }

  async run(options = {}) {
    const { silent = false, bail = false, filter = null } = options;
    const results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      durationMs: 0,
      suites: [],
    };

    const startTime = performance.now();

    const runSuite = async (suite, prefix = '') => {
      const suiteResult = {
        name: prefix ? `${prefix} > ${suite.name}` : suite.name,
        tests: [],
        passed: 0,
        failed: 0,
        skipped: 0,
      };

      for (const t of suite.tests) {
        if (filter && !t.name.includes(filter) && !suiteResult.name.includes(filter)) {
          results.skipped++;
          suiteResult.skipped++;
          continue;
        }

        results.total++;
        const testStartTime = performance.now();
        let status = 'PASS';
        let error = null;

        try {
          // Run suite beforeEach hooks
          for (const hook of suite.beforeEachFns) {
            await hook();
          }

          // Run test function
          await t.fn();

          // Run suite afterEach hooks
          for (const hook of suite.afterEachFns) {
            await hook();
          }

          results.passed++;
          suiteResult.passed++;
        } catch (err) {
          status = 'FAIL';
          error = err;
          results.failed++;
          suiteResult.failed++;
        }

        const duration = Math.round(performance.now() - testStartTime);
        const testResult = {
          name: t.name,
          status,
          duration,
          error: error
            ? {
                message: error.message,
                stack: error.stack,
                actual: error.actual,
                expected: error.expected,
              }
            : null,
        };

        suiteResult.tests.push(testResult);

        if (!silent) {
          const symbol = status === 'PASS' ? `${colors.green}✔ PASS${colors.reset}` : `${colors.red}✖ FAIL${colors.reset}`;
          const timeStr = `${colors.gray}(${duration}ms)${colors.reset}`;
          console.log(`    ${symbol} ${t.name} ${timeStr}`);
          if (error) {
            const firstLine = (error.message || '').split('\n')[0].slice(0, 140);
            console.log(`      ${colors.red}Error: ${firstLine}${colors.reset}`);
            if (error.stack) {
              const lines = error.stack.split('\n').slice(1, 3).map((l) => `        ${colors.gray}${l.trim()}${colors.reset}`);
              console.log(lines.join('\n'));
            }
          }
        }

        if (bail && status === 'FAIL') {
          break;
        }
      }

      results.suites.push(suiteResult);

      if (suite.childSuites) {
        for (const child of suite.childSuites) {
          await runSuite(child, suiteResult.name);
        }
      }
    };

    for (const suite of this.suites) {
      if (!silent) {
        console.log(`\n  ${colors.bold}${colors.cyan}● ${suite.name}${colors.reset}`);
      }
      await runSuite(suite);
      if (bail && results.failed > 0) break;
    }

    results.durationMs = Math.round(performance.now() - startTime);
    return results;
  }
}

// Global registry instance
export const registry = new TestRegistry();
export const describe = (name, fn) => registry.describe(name, fn);
export const test = (name, fn, options) => registry.test(name, fn, options);
export const it = test;
export const beforeEach = (fn) => registry.beforeEach(fn);
export const afterEach = (fn) => registry.afterEach(fn);
