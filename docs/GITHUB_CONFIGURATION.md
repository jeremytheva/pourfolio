# Manual GitHub configuration

Repository files cannot configure the following settings. A repository administrator should complete and verify this checklist; it is not evidence that any setting is already enabled.

## Recommended labels
`type: feature`, `type: bug`, `type: architecture`, `type: security`, `type: technical-debt`, `type: documentation`; `priority: P0`–`priority: P3`; `status: blocked`, `status: needs-refinement`, `status: codex-ready`, `status: review`; and `size: XS`, `size: S`, `size: M`, `size: L`, `size: XL`.

## Recommended project fields
Use **Status**, **Project or product**, **Type**, **Priority**, **Complexity**, **Milestone**, **Codex ready**, and **Dependencies**. Recommended Status values: Backlog, Refinement, Ready, In progress, Review, Blocked, and Done.

The authoritative Phase 0–6 milestone names, issue field contract, staged issue
contracts and backlog mapping are in [Phase 0–6 release tracking](RELEASE_TRACKING.md).
Those contracts must be created in GitHub Issues only after an administrator
enables the tracker; repository documentation is not a substitute for issues.

## Administrator checklist

- [ ] Enable GitHub Issues or nominate and document another issue tracker.
- [ ] Protect `main` and require a pull request before every merge; direct pushes must not be an allowed path to production.
- [ ] Dismiss stale pull-request approvals when new commits are pushed.
- [ ] Disable force-pushes to `main` and disable deletion of `main`. Automatic deletion of **merged head branches** may be enabled separately; it is not evidence that deletion of `main` is disabled.
- [ ] Require status checks to pass and require the pull-request branch to be up to date with `main` before merging (strict status checks).
- [ ] On a pull request for the candidate commit, copy the exact check context reported by GitHub for each of the `Release gate`, `Browser and accessibility`, `Dependency review`, and CodeQL `Analyse JavaScript` jobs into the evidence record below. Workflow and job display names in YAML are hints only and must not be entered as observed contexts without checking GitHub.
- [ ] Configure those four **observed contexts** as required checks for `main`, then verify the branch rule or ruleset contains exact character-for-character matches. Do not select similarly named, stale, or push-only contexts.
- [ ] Require every repository deployment-status check that GitHub reports for the candidate commit. Record each actual observed context (for example, contexts emitted by the repository's deployment provider) and verify every one against the same candidate SHA; do not assume or invent a provider/check name.
- [ ] Restrict branch-protection or ruleset bypass permission to a recorded list of specifically authorised actors. If the repository's GitHub plan or rule type cannot restrict bypasses, retain a GitHub audit-log record for **every** bypass, identifying the actor, reason, time, affected rule and commit SHA, and have the independent reviewer approve it.
- [ ] Enable issue forms and verify `Closes #` issue auto-linking/closing behaviour.
- [ ] Configure required reviewers only when reliable ownership is known; no `CODEOWNERS` file is supplied because ownership is not evidenced in this repository.
- [ ] Enable Dependabot alerts, secret scanning, and push protection where available.
- [ ] Enable Dependency Graph so the dependency review action can operate successfully.
- [ ] Retain the workflow URL, commit SHA and successful `Dependency review` result from a pull-request run before marking Dependency Graph and Dependency Review configuration complete.
- [ ] Make the exact observed `Dependency review` context a required branch-protection check if it must block merging independently of the workflow's failure behaviour.
- [ ] Review Dependabot alerts weekly.
- [ ] Add deployment environment protection and restrict production secret access.
- [ ] Close or archive obsolete Supabase and prototype pull requests that cannot merge into the canonical architecture.
- [ ] Configure authorised Codex repository access and Codex pull-request review where available.
- [ ] Configure GitHub Project fields, labels, and automation.
- [ ] Confirm Actions permissions remain least privilege.

### Release-critical administrator evidence

The checklist is a set of required actions, not a statement of the current
configuration. **Do not mark any item complete until an administrator has
observed the remote setting and, where applicable, the exact GitHub check
context.** Repository files, workflow YAML, a local test result, or a proposed
context name are not substitutes for remote evidence.

For each Phase 0 verification, retain a dated GitHub settings export or a
redacted screenshot that shows the setting and enough surrounding GitHub UI to
identify what was inspected. Store the evidence privately according to the
organisation's security and retention policy, and record all of the following
in the delivery or change record:

- repository identity as the full `owner/repository` name (and GitHub host for
  GitHub Enterprise Server), not just the repository's local directory name;
- the exact 40-character candidate commit SHA;
- the administrator's name or GitHub login and the UTC date and time of the
  observation;
- an independent reviewer's name or GitHub login, review date and approval;
- a reference to the dated settings export or redacted screenshot; and
- the branch rule or ruleset name or identifier that applies to `main`.

The export or screenshots must prove, for `main`, that pull requests are
required, stale approvals are dismissed after new commits, force-pushes and
branch deletion are disabled, required checks use strict/up-to-date mode, and
bypass is limited to the recorded authorised actors. Where bypass restriction
is unavailable, attach the audit-log evidence described in the checklist for
every bypass instead. Also prove production environment access and secrets are
restricted to authorised deployers, and that secret scanning, push protection
and Dependency Graph are enabled rather than merely available under the
organisation plan.

Use a candidate pull request to populate the following evidence table from the
checks GitHub reports on the candidate SHA. Copy context strings exactly,
including workflow prefixes, punctuation and capitalisation. Do not prefill the
**Observed GitHub context** column from `.github/workflows` display names. Each
row needs a link or evidence reference that resolves to the exact candidate SHA
and a successful result before its related checklist item can be completed.

| Required result | Observed GitHub context (exact string) | Candidate SHA | Successful run or status evidence |
| --- | --- | --- | --- |
| `Release gate` job | _Pending remote observation_ | _Pending_ | _Pending_ |
| `Browser and accessibility` job | _Pending remote observation_ | _Pending_ | _Pending_ |
| `Dependency review` job | _Pending remote observation_ | _Pending_ | _Pending_ |
| CodeQL `Analyse JavaScript` job | _Pending remote observation_ | _Pending_ | _Pending_ |
| Repository deployment status check (add one row per context) | _Pending remote observation_ | _Pending_ | _Pending_ |

After recording the contexts, compare the required-check configuration with
the table character for character and capture that comparison in the settings
evidence. Confirm that all rows, including every deployment status emitted by
the repository, apply successfully to the **same** candidate SHA. A deployment
for an earlier commit, a workflow run on a merge commit that is not the
candidate, or a successful check with a different context does not satisfy this
gate.

The `Dependency review` job has no `continue-on-error` setting and is configured
to fail on vulnerabilities of high severity or above. Dependency Graph must be
enabled for the action to operate successfully. An administrator must observe a
successful `Dependency review` run on a pull request and retain its workflow
URL, commit SHA and result before marking the Dependency Graph and Dependency
Review configuration complete. A job failure fails the workflow; it does not,
by itself, make `Dependency review` a required branch-protection check. Requiring
the exact remotely observed check context is a separate administrator setting.
As of 3 August 2026 this delivery environment has no Git remote, GitHub CLI or
repository-administrator evidence, so all remote settings, context names and
deployment checks remain unverified and are not claimed as complete.