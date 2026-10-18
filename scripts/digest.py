#!/usr/bin/env python3
"""Print a compact transcript of one Claude Code session for /pick-up.

Usage: digest.py <session-id> [--max-chars N]   (run from the project directory)

Keeps: the user's messages and slash commands, the assistant's visible text,
each tool call as one line (name + path/command/description), errored tool
results, interrupts, API errors, compactions and warnings. Drops: thinking,
successful tool results, attachments, metadata. Subagent final reports are kept
(truncated) because delegated work only shows up there. A 1-2 MB log becomes
~30 KB. If still longer than --max-chars (default 60000), the opening request
and the end of the session are kept and the middle is elided.
"""
import json
import re
import sys
from pathlib import Path


def clip(s, n):
    s = " ".join(str(s).split())
    return s if len(s) <= n else s[: n - 1] + "…"


def tool_line(c):
    name, inp = c.get("name", "?"), c.get("input") or {}
    if name == "Bash":
        detail = inp.get("command", "")
        return f"TOOL Bash: {clip(detail, 240)}"
    if name in ("Agent", "Task"):
        return f"TOOL {name} [{inp.get('subagent_type', '')}] {inp.get('description', '')}: {clip(inp.get('prompt', ''), 400)}"
    if name == "Skill":
        return f"TOOL Skill: {inp.get('skill', '')} {clip(inp.get('args', ''), 120)}"
    for key in ("file_path", "path", "pattern", "url", "query", "description"):
        if inp.get(key):
            return f"TOOL {name}: {clip(inp[key], 200)}"
    return f"TOOL {name}: {clip(json.dumps(inp), 160)}"


def notification(text):
    if not text.startswith("<task-notification>"):
        return ""
    parts = [m.group(1) for tag in ("status", "summary", "result") if (m := re.search(rf"<{tag}>(.*?)</{tag}>", text, re.S))]
    return "NOTIFY: " + clip(" | ".join(parts), 600)


def result_text(c):
    content = c.get("content")
    if isinstance(content, list):
        content = " ".join(x.get("text", "") for x in content if isinstance(x, dict))
    return content or ""


def main():
    if len(sys.argv) < 2:
        sys.exit("usage: digest.py <session-id> [--max-chars N]")
    sid = sys.argv[1]
    max_chars = int(sys.argv[sys.argv.index("--max-chars") + 1]) if "--max-chars" in sys.argv else 60000
    proj = Path.home() / ".claude" / "projects" / re.sub(r"[^A-Za-z0-9]", "-", str(Path.cwd()))
    log = proj / f"{sid}.jsonl"
    if not log.exists():
        sys.exit(f"no log: {log}")

    lines, agent_calls, last_kind = [], set(), ""
    with open(log, encoding="utf-8", errors="replace") as f:
        for raw in f:
            try:
                r = json.loads(raw)
            except json.JSONDecodeError:
                continue
            t, ts = r.get("type"), (r.get("timestamp") or "")[5:16].replace("T", " ")
            if t == "system":
                sub = r.get("subtype")
                if sub == "compact_boundary":
                    lines.append(f"{ts} --- context compacted ---")
                elif sub in ("api_error", "informational") or r.get("level") in ("warning", "error"):
                    lines.append(f"{ts} SYSTEM {sub}: {clip(r.get('content', ''), 200)}")
                continue
            if t == "continued-in":
                lines.append(f"{ts} --- continued in session {r.get('continuedInSessionId')} ---")
                continue
            if t == "attachment" and (r.get("attachment") or {}).get("type") == "queued_command":
                # Messages typed while a turn was running, and background-task notifications.
                prompt = str(r["attachment"].get("prompt", "")).strip()
                if prompt.startswith("<agent-message"):
                    lines.append(f"{ts} AGENT MESSAGE: {clip(re.sub(r'</?agent-message[^>]*>', '', prompt), 1200)}")
                else:
                    lines.append(f"{ts} {notification(prompt) or 'USER (queued): ' + prompt}")
                continue
            if t not in ("user", "assistant") or r.get("isSidechain"):
                continue
            content = (r.get("message") or {}).get("content")
            if t == "assistant":
                if r.get("isApiErrorMessage") or r.get("error"):
                    lines.append(f"{ts} API ERROR ({r.get('error', '')}): {clip(json.dumps(content), 200)}")
                    last_kind = "api-error"
                    continue
                for c in content if isinstance(content, list) else []:
                    if c.get("type") == "text" and c.get("text", "").strip():
                        lines.append(f"{ts} ASSISTANT: {c['text'].strip()}")
                        last_kind = "assistant-text"
                    elif c.get("type") == "tool_use":
                        lines.append(f"{ts} {tool_line(c)}")
                        if c.get("name") in ("Agent", "Task"):
                            agent_calls.add(c.get("id"))
                        last_kind = "tool-call"
                continue
            # user records
            if r.get("isMeta"):
                continue
            if isinstance(content, str):
                text = content.strip()
                if "<local-command-caveat>" in text or text.startswith("<local-command-stdout>"):
                    continue
                if notification(text):
                    lines.append(f"{ts} {notification(text)}")
                    continue
                m = re.search(r"<command-name>(.*?)</command-name>", text)
                if m:
                    args = re.search(r"<command-args>(.*?)</command-args>", text, re.S)
                    lines.append(f"{ts} CMD {m.group(1)} {clip(args.group(1), 200) if args else ''}".rstrip())
                elif text:
                    lines.append(f"{ts} USER: {text}")
                    last_kind = "user"
                continue
            for c in content if isinstance(content, list) else []:
                if c.get("type") == "text":
                    text = c.get("text", "").strip()
                    if text.startswith("[Request interrupted"):
                        lines.append(f"{ts} INTERRUPTED: {text}")
                        last_kind = "interrupted"
                    elif text and not text.startswith("<"):
                        lines.append(f"{ts} USER: {text}")
                        last_kind = "user"
                elif c.get("type") == "tool_result":
                    if c.get("is_error"):
                        lines.append(f"{ts} TOOL ERROR: {clip(result_text(c), 300)}")
                    elif c.get("tool_use_id") in agent_calls:
                        lines.append(f"{ts} SUBAGENT REPORT: {clip(result_text(c), 1200)}")
                    last_kind = "tool-result"

    ending = {
        "assistant-text": "the assistant's final text (finished its turn: check for a question or offer)",
        "tool-call": "a tool call with no result (turn cut off mid-tool: crash, kill or usage limit)",
        "tool-result": "a tool result with no reply (turn cut off before the assistant answered)",
        "interrupted": "a user interrupt",
        "api-error": "an API error (usage limit, overload or network)",
        "user": "a user message with no reply",
    }.get(last_kind, "nothing conversational")

    out = "\n".join(lines)
    if len(out) > max_chars:
        head = out[: max_chars // 10]
        tail = out[-(max_chars - len(head)) :]
        out = f"{head}\n\n[… {len(out) - len(head) - len(tail)} chars of the middle elided …]\n\n{tail}"
    print(out)
    print(f"\nLOG ENDS WITH: {ending}")


if __name__ == "__main__":
    main()
