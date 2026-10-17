/** The band's text; null outside a repo that uses prog. */
export type BandLine = string | null

declare module 'claude-code' {
  interface PluginState {
    'prog-tracker': { line: BandLine }
  }
}
