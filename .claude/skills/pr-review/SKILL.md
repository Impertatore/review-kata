---
name: pr-review
description: Review the current PR or diff. Produces a summary, flags
  assumptions, and highlights untested behaviour. Use whenever preparing
  to leave review comments on a pull request.
---

# PR Review

You are reviewing a pull request. Do the following, in order:

1. **Get the diff.** If given a PR number, run `gh pr diff <number>`. If given
   a branch, run `git diff main...<branch>`. Otherwise review
   `git diff main...HEAD`. Read the whole diff before writing anything. If you
   cannot obtain it, say so and stop — do not review from memory, from the
   PR description, or from a file you have not opened in this session.

2. **Summary.** In three sentences, describe what this PR changes, what
   it's trying to achieve, and what it deliberately does not touch.

3. **Assumptions.** List the assumptions this code is making about the
   rest of the system. For each, note what would break if the assumption
   turned out to be wrong.

4. **Untested behaviours.** List the behaviours this PR introduces or
   changes. For each, note whether there is a test that would fail if
   the behaviour regressed. Open the test file and read the assertions —
   a test file existing is not coverage.

5. **A second angle.** Re-read the diff as a persona the change actually
   has consequences for, and say which one you picked. Weekend on-call for
   anything that runs in production; a new starter for anything that changes
   setup, docs, or an idiom others will copy; a security lead for anything
   touching credentials, personal data, or dependencies. If one persona
   yields nothing, that is a finding about the change, not a reason to skip.

Keep each section short. Quote specific lines or files where relevant.

## Never

- **Never approve.** Never say the PR looks good, is ready to merge, or is
  safe to ship. You produce findings; the human decides.
- **Never pad the review.** If you are unsure whether something is a defect,
  say you are unsure and say why. One invented finding costs more than one
  missed finding, because it teaches the reader to discount everything else
  you said.
- **Never claim test coverage you have not read.** If a behaviour has no
  assertion that would fail when it regresses, say so plainly.
- **Never assume green means correct.** A suite that passes against the
  unfixed code proves nothing about the fix.

See `test-cases.md` in this directory for the eval set and how to score a run.
