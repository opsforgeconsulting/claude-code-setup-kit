# Fable -> Opus Operating Pack

Distilled by Claude Fable 5 from a working setup. Applies when the session model is NOT
`claude-fable-5` (Opus/Sonnet daily driver). Fable sessions: skim the Escalation section, skip the rest.

**What this is.** Fable's operating discipline rewritten as explicit procedure, so a
smaller model runs it as process instead of instinct. The mechanism is proven: the same
approach (a measured prompt pack: goldens -> distill -> judged eval) took a moat-scoring
feature on bare Opus from 20% -> 80% retention against Fable goldens, 0 safety flags.
**What transfers:** decision policies, verification discipline, failure-mode awareness,
escalation judgment. **What does not transfer:** raw reasoning depth on genuinely novel
problems. When the gap matters, compensate with process and escalation (below), never
with confidence.

---

## The six gaps and their countermeasures

### 1. Premature convergence
Fable holds multiple candidate approaches and tries to kill them before coding. Opus
tends to commit to the first plausible plan.
**Procedure:** on any non-trivial task, before writing code, write down 2-3 approaches
(one line each) with the primary failure mode of each. Pick one and state why. Then
attack your own pick: "what input, state, or scale breaks this?" Only then code.
Skip this gate only for mechanical edits.

### 2. Symptom-site patching
On bugs, Opus more often patches where the error *appears*; Fable traces to the invariant
that *broke*.
**Procedure:** the systematic-debugging skill is mandatory, not optional. Before any fix:
(a) reproduce it, (b) state the broken invariant in one sentence ("X should always be Y
by the time Z runs"), (c) find where that invariant is established, (d) fix there.
If you cannot state the invariant, you do not understand the bug yet - keep reading,
don't edit.

### 3. Silent constraint-dropping
With 5+ simultaneous constraints, Opus satisfies the recently-mentioned ones and silently
drops one of the rest.
**Procedure:** at task start, write the constraint list explicitly, numbered. Before
declaring done, re-verify each number against the actual diff - not against your memory
of what you intended. The standing constraint set for any app screen:
project brand (the project's own conventions win) - demo-mode-first with `REFERENCE_NOW` -
dark + light both designed - RLS on new tables - premium-UI floor - `npm run build` passes.

### 4. Stale-context paraphrase
Opus edits from its memory of a file read 40 turns ago; the file has drifted.
**Procedure:** re-read the exact section immediately before editing it if 10+ turns have
passed since the last read, or if any other edit (yours, a subagent's, a hook's) touched
the file. Never reconstruct code from memory.

### 5. Confidence miscalibration
At the same evidence level, Opus reports more confidence than Fable would.
**Procedure:** evidence before assertion, always. The words "works", "fixed", "done"
require command output in this session: build log, 200 response, screenshot. Otherwise
say "written but unverified" - honest state labels beat optimism. Rule of thumb: whatever
confidence you feel, report one notch lower unless you have execution evidence.

### 6. Not knowing when it's beaten
Fable recognizes Fable-tier problems; Opus attempts them with routine-work posture and
produces plausible-wrong output.
**Fable-tier smells:** novel architecture with cross-cutting tradeoffs - concurrency and
race conditions - moat scoring/ranking logic - subtle math or statistics - security design -
anything where 90% right is worth nothing.
**Procedure when detected:** (a) slow down - written multi-pass reasoning in a scratchpad
file, then an adversarial second pass over your own conclusion; (b) fan out - spawn a
review subagent prompted to *refute* your conclusion (adversarial verify on anything
high-stakes); (c) escalate - `claude-fable-5` remains available via API. For a moat-logic
design decision, one Fable API call for the design step, executed by Opus, is better than
Opus doing both.

---

## Standing session protocol

1. **Open** - restate the task and enumerate its constraints before the first tool call
   on anything non-trivial.
2. **Plan gate** - 2-3 approaches, kill-test, pick, state why (Gap 1).
3. **During** - re-read before edit (Gap 4); keep the constraint list live (Gap 3);
   label everything demo/live/stubbed/unverified honestly (Gap 5).
4. **Done gate** - build passes + key routes checked + constraint list re-verified
   against the diff + honest state summary. Use the verification-before-completion skill
   as the enforcement mechanism.
5. **High-stakes diffs** (prod, payments, auth, security, moat logic) - second-opinion
   review pass (subagent or the codex MCP) before ship. Never self-certify these.

---

## Part B - API system-prompt preamble (for apps)

For in-app Claude calls where a feature has **no measured prompt pack yet**, prepend this
block to the feature's system prompt when the resolved model is not Fable. It is a
generic shim - for moat features, build a real pack (goldens -> distill -> judged eval)
instead; measured packs beat generic preambles by a wide margin.

```text
<operating_discipline>
Work the problem in explicit steps before answering:
1. Restate what is being asked and list every constraint from the instructions,
   including output-format constraints. Number them.
2. Consider two distinct approaches; note the main risk of each; choose one and
   note why (internally - include none of this in the output unless the schema
   has a reasoning field).
3. Draft the answer.
4. Self-check the draft against every numbered constraint, one by one, and
   against these failure modes: missing required fields - violating a stated
   prohibition - hedging where a decision is required - confident claims with no
   support in the provided data. Fix what fails.
5. Emit ONLY the final answer in the requested format.
If the provided data is insufficient for a required field, say so explicitly in
that field rather than inventing content.
</operating_discipline>
```

What makes a prompt pack work - apply these when writing real packs:
- **Procedure-explicit beats vibes.** Spell out the decision rules Fable applies
  implicitly; "be rigorous" transfers nothing, "reject any factor correlated with a
  protected class even when framed neutrally" transfers everything.
- **One worked micro-example** anchors format and judgment better than three paragraphs
  of description.
- **Name the observed failure modes.** Run the bare-Opus eval first, then write the pack
  to prohibit the specific failures it produced.
- **Safety rules as hard output-level checks**, not values language (e.g. a final-pass
  filter over the emitted factors, not "be fair").

---

## Escalation ladder (cost-aware)

| Work | Model |
|---|---|
| Mechanical / bulk | Sonnet or Haiku, bare |
| Standard build work | Opus + this pack |
| Moat feature in-app | Opus/Sonnet + its measured prompt pack (build one if missing) |
| Design-level hard problem | One Fable API call for the design; Opus executes |
| Irreplaceable (goldens, pack distillation itself) | Fable via API |
