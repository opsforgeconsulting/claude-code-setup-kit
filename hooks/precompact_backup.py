#!/usr/bin/env python3
"""PreCompact hook — snapshot the session transcript before Claude Code compacts
it, so full session detail survives compaction.

Claude Code passes the compaction event as JSON on stdin
({transcript_path, session_id, trigger, ...}). We copy the transcript into
~/.claude/session-logs/ (one current backup per session, refreshed before each
compaction) and append a one-line audit entry. Always exits 0 — a backup failure
must never block compaction.
"""
import json
import os
import shutil
import sys
from datetime import datetime

LOGS = os.path.join(os.path.expanduser("~"), ".claude", "session-logs")


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

    try:
        os.makedirs(LOGS, exist_ok=True)
        # one backup per session, overwritten each compaction = latest full state
        dest = os.path.join(LOGS, f"{datetime.now():%Y-%m-%d}_{sid}.jsonl")
        shutil.copy2(src, dest)
    except Exception:
        return

    try:
        size_kb = max(1, os.path.getsize(dest) // 1024)
        with open(os.path.join(LOGS, "INDEX.md"), "a", encoding="utf-8") as f:
            f.write(f"- {datetime.now():%Y-%m-%d %H:%M} - session `{sid}` - "
                    f"{trigger}-compact - {size_kb} KB - `{os.path.basename(dest)}`\n")
    except Exception:
        pass

    # ASCII only — hook stdout is cp1252 on Windows and chokes on non-ASCII
    print(f"[precompact] transcript backed up -> session-logs/{os.path.basename(dest)}")


if __name__ == "__main__":
    main()
