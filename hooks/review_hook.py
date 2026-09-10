#!/usr/bin/env python
"""PostToolUse hook: auto-review code files right after Claude writes/edits them.

Sends the just-saved file to a non-Claude model (OpenAI by default) for a quick
second opinion and prints it INLINE so the feedback feeds straight back into the
session. Logs one JSONL line per review to memory/harness-log/ so skill-stocktake
can judge the harness on evidence.

Config via environment:
  OPENAI_API_KEY   required - if unset, the hook silently exits (nothing breaks)
  REVIEW_MODEL     optional - defaults to "gpt-5.4-mini" (GPT-4o and 4.x are obsolete)
  CC_MEMORY_DIR    optional - where the harness log goes; defaults to the project's
                   auto-memory folder (~/.claude/projects/<cwd-slug>/memory)

Wired in settings.json as a PostToolUse hook matching Write|Edit.
"""
import sys
import json
import os
import re
import urllib.request
import urllib.error
from datetime import datetime, timezone

DEFAULT_MODEL = "gpt-5.4-mini"


def memory_dir(cwd_hint=None):
    env = os.environ.get("CC_MEMORY_DIR")
    if env:
        return env
    cwd = cwd_hint or os.getcwd()
    slug = re.sub(r"[:\\/]", "-", cwd)
    return os.path.join(os.path.expanduser("~"), ".claude", "projects", slug, "memory")


def log_event(log_dir, sid, file_path, ok):
    """One JSONL line per review into the monthly harness log. Never raises."""
    try:
        os.makedirs(log_dir, exist_ok=True)
        ts = datetime.now(timezone.utc).isoformat(timespec="seconds")
        line = json.dumps({"ts": ts, "sid": (sid or "")[:8], "src": "review",
                           "file": os.path.basename(file_path)[:80], "ok": ok})
        with open(os.path.join(log_dir, ts[:7] + ".jsonl"), "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


CODE_EXTS = {'.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.cs', '.java',
             '.rs', '.cpp', '.c', '.h', '.rb', '.php', '.swift', '.vue', '.svelte'}


def call_api(url, key, model, content, label):
    prompt = (
        "Review this code concisely. Flag: bugs, security issues, performance problems, "
        "and quick wins. Skip praise. Be direct.\n\n"
        f"```\n{content[:8000]}\n```"
    )
    # GPT-5.x: max_completion_tokens (max_tokens -> 400), no custom temperature
    payload = json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_completion_tokens": 800
    }).encode()
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        return f"[{label} error: {e}]"


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    file_path = data.get("tool_input", {}).get("file_path", "")
    if not file_path:
        sys.exit(0)

    _, ext = os.path.splitext(file_path)
    if ext not in CODE_EXTS:
        sys.exit(0)

    if not os.path.exists(file_path):
        sys.exit(0)

    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    if not content.strip() or len(content) > 100_000:
        sys.exit(0)

    openai_key = os.environ.get("OPENAI_API_KEY", "")
    if not openai_key:
        sys.exit(0)

    model = os.environ.get("REVIEW_MODEL", DEFAULT_MODEL)
    print(f"\n[AUTO-REVIEW] {file_path}")
    print(f"[{model}] reviewing...")
    review = call_api(
        "https://api.openai.com/v1/chat/completions",
        openai_key, model, content, model
    )
    print(review[:1200])
    log_dir = os.path.join(memory_dir(data.get("cwd")), "harness-log")
    log_event(log_dir, data.get("session_id", ""), file_path, not review.startswith("["))


if __name__ == "__main__":
    main()
