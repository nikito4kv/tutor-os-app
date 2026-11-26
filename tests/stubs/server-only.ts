// Test stub for the `server-only` marker package. In production Next resolves
// `import "server-only"` to a module that throws if bundled for the client; in
// the vitest (node) environment there is no such bundler, so we alias it to this
// no-op so server-only modules (e.g. features/lessons/recurrence.ts) can be
// imported and their pure logic unit-tested. Wired up via vitest.config.ts.
export {};
