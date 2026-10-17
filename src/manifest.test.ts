import { expect, test } from 'bun:test';
import pkg from '../package.json';
import plugin from '../.claude-plugin/plugin.json';

// CI pins the docs check to a git tag named for package.json's version, and
// installs update by plugin.json's version, so the two must move together.
test('plugin.json and package.json carry the same version', () => {
  expect(plugin.version).toBe(pkg.version);
});
