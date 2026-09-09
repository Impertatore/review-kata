---
name: enumerate-behaviours
description: List the behaviours worth pinning down for a function, class or module — happy paths, error paths, boundaries, interactions — WITHOUT writing any test code. Use before writing tests, before reviewing a change, or whenever the user asks "what should we test here", "what could go wrong", or "what does this actually do".
---

# Enumerate behaviours

Produce a list a human will read and edit. Write no test code. The list is the
deliverable; its job is to make the reader notice something.

## Output — exactly these four sections, one line per entry

**Happy paths** — what the code does when inputs are as expected, as observable
outcomes ("returns the cached value on a second call within TTL"), never as
implementation steps ("loops over items").

**Error paths** — every way it could throw or return a wrong answer: empty,
single element, null/undefined, wrong type, negative/zero, missing field,
floating-point drift, unicode, external call fails or hangs, concurrent
callers. Include the unlikely ones; the reader deletes, you don't.

**Boundaries** — every threshold, limit, length or comparison gets its own
entry naming the exact boundary value and both neighbours. If the code uses
`>` where `>=` would also be plausible, say so; that's a behaviour the tests
must distinguish.

**Interactions** — behaviours that only appear when two things combine:
discount applied twice, cancel after pay, read during sweep, same key from
two callers.

## Mark what you don't know

If a behaviour is not clear from the code — the intended result of a
boundary, whether an input is allowed, what "correct" means for an edge — prefix
the line with **[assumed]** and state the assumption. Don't resolve it
yourself. The human decides; that's the point of the list.

## Never

- Never write test code, even as an example.
- Never drop an entry because it seems paranoid — mark it, let the reader cut it.
- Never state an assumption as a fact; if you inferred it, it's [assumed].

## Then stop

End with: "Edit this list, then run /write-tests with it." Don't continue into
tests unless explicitly asked.
