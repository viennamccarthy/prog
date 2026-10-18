import { expect, test } from 'bun:test';
import { BLOCK_VERSION, blockVersion } from './marker';

test('reads the version from the marker', () => {
  expect(blockVersion('x\n<!-- prog v2 -->\n## How\n<!-- /prog -->')).toBe(2);
  expect(blockVersion('<!-- prog v13 -->')).toBe(13);
});

test('an unmarked v1 block counts as v1', () => {
  expect(blockVersion('This repo follows the repo system.')).toBe(1);
});

test('the marker wins over the v1 phrase', () => {
  expect(blockVersion('repo system\n<!-- prog v2 -->')).toBe(2);
});

test('no CLAUDE.md, or one without the block, means not set up', () => {
  expect(blockVersion(null)).toBeNull();
  expect(blockVersion('# Just a project')).toBeNull();
});

test('the block this build writes is at least v2', () => {
  expect(BLOCK_VERSION).toBeGreaterThanOrEqual(2);
});
