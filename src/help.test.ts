import { expect, test } from 'bun:test';
import { HELP, HELP_COLUMNS, HELP_ROWS } from './help';

test('help fits its frame', () => {
  const lines = HELP.split('\n');
  expect(lines.length).toBeLessThanOrEqual(HELP_ROWS);
  for (const line of lines) expect(line.length).toBeLessThanOrEqual(HELP_COLUMNS);
});
