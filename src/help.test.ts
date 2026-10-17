import { expect, test } from 'bun:test';
import { HELP, HELP_COLUMNS, HELP_ROWS, SUBCOMMANDS } from './help';

test('help fits its frame', () => {
  const lines = HELP.split('\n');
  expect(lines.length).toBeLessThanOrEqual(HELP_ROWS);
  for (const line of lines) expect(line.length).toBeLessThanOrEqual(HELP_COLUMNS);
});

test('every typeahead subcommand is in the help, with the same usage', () => {
  for (const s of SUBCOMMANDS.filter((s) => s.name !== 'help')) {
    const shown = s.usage.replace('[task]', '<task>');
    expect(HELP).toContain(`/prog ${shown}`);
  }
});
