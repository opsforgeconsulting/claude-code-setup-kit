#!/usr/bin/env python3
"""PreCompact hook: snapshot the session transcript before Claude Code
compacts it, so full session detail survives compaction.

Claude Code passes the compaction event as JSON on stdin
({transcript_path, session_id, trigger, cwd, ...}). We copy the transcript into
the project's auto-memory folder under session-logs/ (one current backup per
session, refreshed before each compaction) and append a one-line audit entry.
Recall (recall.mjs) indexes that folder, so past sessions stay searchable.
Always exits 0: a backup failure must never block compaction.

Kit version (generalized): the memory folder is derived from the session cwd
(~/.claude/projects/<cwd-slug>/memory), overridable with CC_MEMORY_DIR.
"""
import json
import os
import re
import shutil
import sys
from datetime import datetime


def memory_dir(cwd_hint=None):
    env = os.environ.get("CC_MEMORY_DIR")
    if env:
        return env
    cwd = cwd_hint or os.getcwd()
    slug = re.sub(r"[:\\/]", "-", cwd)
    return os.path.join(os.path.expanduser("~"), ".claude", "projects", slug, "memory")


def main() -> None:
    try:
        data = json.load(sys.stdin)
    except Exception:
        return
    src = data.get("transcript_path")
    sid = (data.get("session_id") or "unknown")[:8]
    trigger = data.get("trigger", "auto")  # "auto" (context full) or "manual" (/compact)
    if not src or not os.path.isfile(src):
        return

    logs = os.path.join(memory_dir(data.get("cwd")), "session-logs")
    try:
        os.makedirs(logs, exist_ok=True)
        # one backup per session, overwritten each compaction = latest full state
        dest = os.path.join(logs, f"{datetime.now():%Y-%m-%d}_{sid}.jsonl")
        shutil.copy2(src, dest)
    except Exception:
        return

    try:
        size_kb = max(1, os.path.getsize(dest) // 1024)
        with open(os.path.join(logs, "INDEX.md"), "a", encoding="utf-8") as f:
            f.write(f"- {datetime.now():%Y-%m-%d %H:%M} - session `{sid}` - "
                    f"{trigger}-compact - {size_kb} KB - `{os.path.basename(dest)}`\n")
    except Exception:
        pass

    # ASCII only: hook stdout is cp1252 on Windows and chokes on non-ASCII
    print(f"[precompact] transcript backed up -> memory/session-logs/{os.path.basename(dest)}")


if __name__ == "__main__":
    main()
