import { expect, test } from 'claude-code/testing'

test('typing /prog pl suggests plan, with its usage', async ($, on) => {
  on('prompt.autocomplete', () => ({ suggestions: [] }))
  const r = await $.prompt.autocomplete({ text: '/prog pl', cursor: 8, token: 'pl', start: 6 })
  expect(r.suggestions).toEqual([{ text: 'plan', label: 'plan [task]', description: 'draft a plan; none: carry on' }])
})

test('other prompts get no prog suggestions', async ($, on) => {
  on('prompt.autocomplete', () => ({ suggestions: [] }))
  const r = await $.prompt.autocomplete({ text: 'plan the thing', cursor: 4, token: 'plan', start: 0 })
  expect(r.suggestions).toEqual([])
})

test('the router skill is hidden from the menu, so /prog is the one entry', async ($, on) => {
  on('command.describe', ($, e) => ({ description: e.description, argumentHint: e.argumentHint, isHidden: e.isHidden }))
  const r = await $.command.describe({
    command: 'prog-tracker:cmd',
    description: 'router',
    isHidden: false,
    immediate: false,
    provider: { plugin: 'prog-tracker', tier: 'user' },
  } as any)
  expect(r.isHidden).toBe(true)
})

test('/prog prints the help when no pane can be placed', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: false, reason: 'no room' } }) as any)
  const r = await $.command.run({ command: 'prog', args: '' })
  expect(r.text).toContain('/prog status')
  expect(r.text).toContain('How it fits together')
})
