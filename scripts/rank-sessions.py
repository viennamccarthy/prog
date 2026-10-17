#!/usr/bin/env python3
"""Rank this project's Claude Code sessions to find the one /pick-up should resume.

Usage: rank-sessions.py <current-session-id> [--limit N]

Run from the project directory. Reads only tool-call and metadata records, never
whole conversations. Two signals, reported separately because they can disagree:

- OWNER: the session that actually wrote the files `git status` shows as changed.
  Edit/Write paths (main log + its subagents) are strong evidence; a Bash command
  that writes to a changed path (>, tee, sed -i, git mv/rm, cp, mv, rm, touch) is
  weak evidence. A path merely named in a read or grep does not count.
- MOST RECENT: the session with the newest tool call. File mtime is NOT used:
  resuming, exiting or clearing a session appends metadata and bumps it.

A `continued-in` record means the session was backgrounded or moved and carries
on under a new id whose log copies the whole history. It is not written by
/clear (a /clear shows up only as a command record in the new session's log).
"""
import json
import os
import re
import subprocess
import sys
from pathlib import Path

WRITE_TOOLS = {"Edit", "Write", "MultiEdit", "NotebookEdit"}
WRITE_OPS = r"(?:>>?|\btee(?:\s+-a)?|\bsed\s+-i\S*(?:\s+(?:'[^']*'|\"[^\"]*\"|\S+))*?|\bperl\s+-\S*i\S*(?:\s+(?:'[^']*'|\S+))*?|\bgit\s+(?:mv|rm)(?:\s+-\S+)*(?:\s+\S+)*?|\b(?:cp|mv|rm|touch)(?:\s+-\S+)*(?:\s+\S+)*?)"
NULL_REDIRECTS = re.compile(r"\d?>&\d|&?\d?>>?\s*/dev/null")


def sh(*args, env_utc=False):
    env = {**os.environ, "TZ": "UTC"} if env_utc else None
    r = subprocess.run(args, capture_output=True, text=True, env=env)
    return r.stdout if r.returncode == 0 else ""


def dirty_paths(top):
    out = sh("git", "-C", top, "status", "--porcelain", "--untracked-files=all")
    paths = []
    for line in out.splitlines():
        p = line[3:]
        if " -> " in p:
            old, new = p.split(" -> ", 1)
            paths += [old.strip('"'), new.strip('"')]
        else:
            paths.append(p.strip('"'))
    return paths


def iter_records(path):
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            for line in f:
                # Cheap prefilter: only parse lines that can matter here.
                if '"tool_use"' in line or '"continued-in"' in line or '"ai-title"' in line or '"last-prompt"' in line:
                    try:
                        yield json.loads(line)
                    except json.JSONDecodeError:
                        pass
    except OSError:
        return


def scan(main_log, since):
    s = {"last_tool": "", "tools": 0, "edited": set(), "bash": [], "title": "", "last_prompt": "", "continued_in": []}
    logs = [main_log] + sorted((main_log.parent / main_log.stem / "subagents").glob("*.jsonl"))
    for i, log in enumerate(logs):
        for r in iter_records(log):
            t = r.get("type")
            if t == "ai-title" and i == 0:
                s["title"] = r.get("aiTitle", "")
            elif t == "last-prompt" and i == 0 and r.get("lastPrompt"):
                s["last_prompt"] = r["lastPrompt"]
            elif t == "continued-in" and i == 0:
                s["continued_in"].append((r.get("continuedInSessionId", ""), r.get("timestamp", "")))
            elif t == "assistant":
                content = (r.get("message") or {}).get("content")
                if not isinstance(content, list):
                    continue
                ts = r.get("timestamp", "")
                for c in content:
                    if c.get("type") != "tool_use":
                        continue
                    # /pick-up's own calls aren't activity; this keeps a fresh post-/clear session out.
                    if (c.get("input") or {}).get("subagent_type") == "session-recon" or (c.get("input") or {}).get("skill") == "pick-up":
                        continue
                    s["tools"] += 1
                    s["last_tool"] = max(s["last_tool"], ts)
                    # Writes made before the last commit are most likely already in it.
                    if ts <= since:
                        continue
                    inp = c.get("input") or {}
                    if c.get("name") in WRITE_TOOLS and inp.get("file_path"):
                        s["edited"].add(inp["file_path"])
                    elif c.get("name") == "Bash" and inp.get("command"):
                        s["bash"].append(NULL_REDIRECTS.sub(" ", inp["command"]))
    return s


def bash_writes(commands, rel, top):
    # The path (repo-relative, absolute, or basename) must directly follow a write op.
    names = {re.escape(rel), re.escape(os.path.join(top, rel)), re.escape(os.path.basename(rel))}
    pat = re.compile(WRITE_OPS + r"\s*[\"']?[^\s\"']*?(?:" + "|".join(names) + r")(?=[\"'\s;&|)]|$)")
    return any(pat.search(cmd) for cmd in commands)


def main():
    if len(sys.argv) < 2:
        sys.exit("usage: rank-sessions.py <current-session-id> [--limit N]")
    current = sys.argv[1]
    limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else 6

    cwd = os.getcwd()
    top = sh("git", "rev-parse", "--show-toplevel").strip() or cwd
    proj = Path.home() / ".claude" / "projects" / re.sub(r"[^A-Za-z0-9]", "-", cwd)
    if not proj.is_dir():
        sys.exit(f"no session logs for this directory: {proj}")

    in_git = bool(sh("git", "rev-parse", "--git-dir"))
    dirty = dirty_paths(top) if in_git else []
    # HEAD's commit time in UTC, formatted like the logs' timestamps so strings compare.
    since = sh("git", "log", "-1", "--format=%cd", "--date=format-local:%Y-%m-%dT%H:%M:%S.000Z", env_utc=True).strip() if in_git else ""
    sessions = {}
    for log in proj.glob("*.jsonl"):
        sid = log.stem
        s = scan(log, since)
        if sid == current or s["tools"] == 0:
            continue
        s["strong"] = sorted(p for p in dirty if os.path.join(top, p) in s["edited"] or p in s["edited"])
        s["weak"] = sorted(p for p in dirty if p not in s["strong"] and bash_writes(s["bash"], p, top))
        s["log"] = str(log)
        sessions[sid] = s

    print(f"repo: {top}")
    print(f"logs: {proj}")
    print(f"current session (excluded): {current}")
    print(f"last commit (writes before this are ignored): {since or 'none'}")
    print(f"changed files ({len(dirty)}):" + ("" if dirty else " none"))
    for p in dirty:
        print(f"  {p}")

    recent = sorted(sessions.items(), key=lambda kv: kv[1]["last_tool"], reverse=True)
    print(f"\nsessions by latest tool call (top {limit} of {len(recent)}):")
    for sid, s in recent[:limit]:
        print(f"- {sid}  last_tool={s['last_tool']}  tool_calls={s['tools']}  strong={len(s['strong'])} weak={len(s['weak'])}")
        print(f"    title: {s['title']!r}")
        print(f"    last prompt: {s['last_prompt'][:160]!r}")
        for target, ts in s["continued_in"]:
            # Written when a session is backgrounded or moved; the target copies the full history.
            if target == current:
                mark = "the current session"
            elif target in sessions:
                mark = "SUPERSEDED: read the target instead; it holds this history plus later work"
            else:
                mark = "target has no tool calls, so this log is still the latest copy"
            print(f"    continued-in -> {target} at {ts} ({mark})")
        if s["strong"]:
            print("    wrote (Edit/Write): " + ", ".join(s["strong"]))
        if s["weak"]:
            print("    wrote (via Bash, weak): " + ", ".join(s["weak"]))

    claimed = {p for s in sessions.values() for p in s["strong"] + s["weak"]}
    unclaimed = [p for p in dirty if p not in claimed]
    if unclaimed:
        print("\nchanged files no session visibly wrote (generated, moved as a directory, written via a shell variable, or edited by hand):")
        for p in unclaimed:
            print(f"  {p}")

    print("\nhints:")
    most_recent = recent[0][0] if recent else None
    owners = sorted(sessions.items(), key=lambda kv: (len(kv[1]["strong"]) * 2 + len(kv[1]["weak"]), kv[1]["last_tool"]), reverse=True)
    owner = owners[0][0] if owners and (owners[0][1]["strong"] or owners[0][1]["weak"]) else None
    print(f"  most recent activity: {most_recent}")
    print(f"  owner of changed files: {owner or 'none'}")
    others = [sid for sid, s in owners[1:] if s["strong"] or s["weak"]]
    if others:
        print(f"  other sessions that wrote changed files: {', '.join(others)}")
    if owner and most_recent and owner != most_recent:
        print("  NOTE: owner and most recent differ; the most recent session may be a side conversation.")


if __name__ == "__main__":
    main()
