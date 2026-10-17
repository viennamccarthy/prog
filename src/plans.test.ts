import { expect, test } from 'bun:test';
import { parsePlan } from './plans';

const plan = `---
issue: 12
branch: 12-search
status: active
---

# Search

## Steps

- [x] First
- [ ] ~~Old second~~
- [ ] **Second**, replacing it
  - [X] a nested sub-step
- [ ] Third

### Close

- [ ] Harvest and delete.
`;

test('reads frontmatter, counts steps and finds the next one', () => {
  expect(parsePlan('12-search', plan)).toEqual({
    name: '12-search',
    issue: 12,
    branch: '12-search',
    status: 'active',
    done: 2,
    total: 5,
    next: 'Second, replacing it',
  });
});

test('rejects names that are not <issue>-<slug>', () => {
  expect(parsePlan('search', plan)).toBeNull();
  expect(parsePlan('12_Search', plan)).toBeNull();
});

test('a plan with every step ticked has no next step', () => {
  const p = parsePlan('3-x', '- [x] one\n- [x] two\n');
  expect(p?.next).toBeUndefined();
  expect(p?.status).toBe('unknown');
});

test('long steps are shortened', () => {
  const p = parsePlan('3-x', `- [ ] ${'word '.repeat(40)}`);
  expect(p?.next?.length).toBeLessThanOrEqual(80);
  expect(p?.next?.endsWith('…')).toBe(true);
});
