#!/usr/bin/env python
"""PostToolUse hook: auto-review code files right after they're written/edited.

Sends the just-saved file to a non-Claude model (OpenAI by default) for a quick
second opinion and prints it INLINE so the feedback feeds straight back into the
session. Nothing is written to disk.

Config via environment:
  OPENAI_API_KEY   required — if unset, the hook silently exits (nothing breaks)
  REVIEW_MODEL     optional — defaults to "gpt-4o-mini"; set to any OpenAI chat
                   model you prefer for reviews

Wired in settings.json as a PostToolUse hook matching Write|Edit.
"""
import sys
import json
import os
import urllib.request

CODE_EXTS = {'.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.cs', '.java',
             '.rs', '.cpp', '.c', '.h', '.rb', '.php', '.swift', '.vue', '.svelte'}

API_URL = "https://api.openai.com/v1/chat/completions"


def call_api(key, model, content, label):
    prompt = (
        "Review this code concisely. Flag: bugs, security issues, performance "
        "problems, and quick wins. Skip praise. Be direct.\n\n"
        f"```\n{content[:8000]}\n```"
    )
    payload = json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 800,
    }).encode()
    req = urllib.request.Request(
        API_URL,
        data=payload,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
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

    model = os.environ.get("REVIEW_MODEL", "gpt-4o-mini")
    print(f"\n[AUTO-REVIEW] {file_path}")
    print(f"[{model}] reviewing...")
    review = call_api(openai_key, model, content, model)
    print(review[:1200])


if __name__ == "__main__":
    main()
