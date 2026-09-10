"""PreToolUse guard: bash heredocs + non-ASCII content corrupt on Windows.

Git Bash on Windows turns em-dashes and curly quotes inside a heredoc into
mojibake and eats backslashes (bit a working setup twice writing JS this way).
Mechanism over discipline: block the combination and point at the Write tool.
Fail-open on ANY error -- this hook must never break normal Bash usage.
Stdout/stderr ASCII only (hook output is cp1252 on Windows).

Windows-specific. On macOS/Linux you can drop this hook from settings.json.
"""
import json
import re
import sys


def main() -> int:
    try:
        payload = json.load(sys.stdin)
        command = (payload.get("tool_input") or {}).get("command", "")
        if not command:
            return 0
        # heredoc writing to a FILE (cat > x << EOF style); plain heredoc into
        # a pipe (python - << EOF) is fine when the code is ASCII, so we only
        # act when non-ASCII is present at all.
        has_heredoc = re.search(r"<<-?\s*['\"]?\w+['\"]?", command) is not None
        if not has_heredoc:
            return 0
        non_ascii = [c for c in command if ord(c) > 127]
        if not non_ascii:
            return 0
        sample = "".join(sorted(set(non_ascii))[:8])
        sys.stderr.write(
            "BLOCKED by heredoc_guard: bash heredocs corrupt non-ASCII on this "
            "Windows setup (found: " + ascii(sample) + "). Em-dashes/quotes become "
            "mojibake and backslashes get eaten. Use the Write or Edit tool for "
            "this content instead (or make the heredoc pure-ASCII).\n"
        )
        return 2
    except Exception:
        return 0  # fail open, always


if __name__ == "__main__":
    sys.exit(main())
