"""PreToolUse guard for Agent / Workflow spawns.

Why: four parallel builder agents once inherited the Fable session model and burned
half a week of Fable usage in one afternoon. Rule: subagents never run on the session model by
accident. Every Agent spawn must name a model, and that model may not be Fable
(judgment work goes to Opus; builders and fan-out go to Sonnet; bulk to Haiku).
Forks always inherit the parent model, so they are blocked too. Workflow scripts
must set a model on their agent() calls.

Output is ASCII-only JSON on stdout (safe on Windows consoles).
"""
import json
import sys

ALLOWED = {"sonnet", "opus", "haiku"}


def deny(reason):
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }))
    sys.exit(0)


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return
    tool = payload.get("tool_name")
    inp = payload.get("tool_input") or {}

    if tool == "Agent":
        sub = (inp.get("subagent_type") or "").strip().lower()
        model = (inp.get("model") or "").strip().lower()
        if sub == "fork":
            deny("BLOCKED (agent_model_guard): subagent_type 'fork' always inherits the session model "
                 "(Fable). Use a general-purpose agent with model 'sonnet' (builders/fan-out) or "
                 "'opus' (judgment) and pass the context it needs in the prompt.")
        if not model:
            deny("BLOCKED (agent_model_guard): Agent spawns must set 'model' explicitly. Never inherit "
                 "the session model. Use model 'sonnet' for builders, fan-out and "
                 "scoped execution; 'opus' for architecture/adversarial review; 'haiku' for bulk.")
        if model not in ALLOWED:
            deny("BLOCKED (agent_model_guard): model '%s' is not allowed for subagents. Allowed: "
                 "sonnet (builders/fan-out), opus (judgment), haiku (bulk). Fable is the session "
                 "driver only." % model)
        return

    if tool == "Workflow":
        script = inp.get("script") or ""
        if script and "model" not in script:
            deny("BLOCKED (agent_model_guard): Workflow script has no 'model' on its agent() calls; "
                 "workflow agents would inherit the session model. Set model: 'sonnet' (or 'opus' "
                 "for verify/judgment) on every agent() call.")
        return


if __name__ == "__main__":
    main()
