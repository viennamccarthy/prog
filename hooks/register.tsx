import type { Register } from 'claude-code'

import { HELP, SUBCOMMANDS } from '../src/help'

const PANE = 'prog'
// The router skill. The mod registers /prog itself: the menu lists a
// registered command by its plain name, but a skill as /prog-tracker:<skill>.
const SKILL = 'prog-tracker:cmd'
const DESCRIPTION = 'Help, status and plans for this repo'

// The pane's body; the module's own, so a reload resets it to the help.
let paneText = HELP
let paneOpen = false

async function show($: any, title: string, text: string) {
  paneText = text
  const r = await $.ui.open({
    id: PANE,
    title: `${title} · Esc closes`,
    focus: true,
    closeOnEscape: true,
    rows: 25,
    columns: 65,
  })
  $.ui.invalidate('ui.render')
  paneOpen = r.isPlaced
  // No room to draw a pane: print instead.
  return r.isPlaced ? {} : { text }
}

async function close($: any) {
  paneOpen = false
  await $.ui.close({ id: PANE }).catch(() => {})
}

async function status($: any): Promise<string> {
  try {
    const r = await $.process.run([`${$.plugin.root}/bin/prog`, 'status', '--full'])
    return r.exitCode === 0 ? r.stdout.trimEnd() : `prog status failed: ${r.stderr.trim()}`
  } catch (err) {
    return `prog status failed: ${String(err)}`
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    try {
      await $.command.register({
        name: 'prog',
        description: DESCRIPTION,
        argumentHint: '[status|resume|plan|done|why|tidy|setup] [notes]',
      })
    } catch (err) {
      $.ui.toast(`prog: couldn't add /prog (${String(err)}); /${SKILL} still works`)
    }
    return next(e)
  })

  // One menu entry. The router skill still runs when typed in full, which is
  // the fallback if this mod is off.
  on('command.describe', { command: SKILL }, async ($, e, next) => {
    const r = await next(e)
    return { description: r.description, argumentHint: r.argumentHint, isHidden: true }
  })

  // Help and status are answered here, so neither starts a model turn;
  // everything else goes to the router skill with its words.
  on('command.run', { command: 'prog' }, async ($, e) => {
    const args = e.args.trim()
    const sub = args.split(/\s+/)[0] ?? ''
    if (sub === '' || sub === 'help') return show($, 'prog help', HELP)
    if (sub === 'status') return show($, 'prog status', await status($))
    // A command can't run another while its own run is open, so the skill
    // runs just after this one returns.
    $.clock.after(50, () => {
      $.command.run({ command: SKILL, args }).catch((err: unknown) => {
        $.ui.toast(`/prog couldn't reach its skill: ${String(err)}. Fallback: /${SKILL} ${args}`)
      })
    })
    return {}
  })

  // Typing or sending anything else closes the pane.
  on('prompt.edit', async ($, e, next) => {
    if (paneOpen) await close($)
    return next(e)
  })
  on('prompt.submit', async ($, e, next) => {
    if (paneOpen && e.command?.name !== 'prog') await close($)
    return next(e)
  })

  on('prompt.autocomplete', async ($, e, next) => {
    const before = e.text.slice(0, e.cursor)
    const m = /^\/prog\s+(\S*)$/.exec(before)
    if (!m) return next(e)
    const typed = m[1] ?? ''
    const own = SUBCOMMANDS.filter(s => s.name.startsWith(typed)).map(s => ({
      text: s.name,
      label: s.usage,
      description: s.summary,
    }))
    return { suggestions: [...own, ...(await next(e)).suggestions] }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column" width={63}>
        {paneText.split('\n').map(line => (
          <Text>{line || ' '}</Text>
        ))}
      </Box>
    )
  })
}
