/** Version of the rules block this build of prog writes. Bump only when the block's text changes. */
export const BLOCK_VERSION = 2;

const MARKER = /<!-- prog v(\d+) -->/;

/**
 * Version of the rules block in a root `CLAUDE.md`: the marker's version, 1 for an
 * unmarked v1 block (recognised by the phrase "repo system"), or null if the repo
 * doesn't use prog.
 */
export function blockVersion(claudeMd: string | null): number | null {
  if (!claudeMd) return null;
  const m = MARKER.exec(claudeMd);
  if (m) return Number(m[1]);
  return /repo system/i.test(claudeMd) ? 1 : null;
}
