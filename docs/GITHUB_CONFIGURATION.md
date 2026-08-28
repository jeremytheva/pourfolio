# Manual GitHub configuration

**Current remote review:** 28 August 2026

Repository files can define workflows and delivery expectations, but they cannot be treated as evidence that GitHub repository settings are active. Administrator-controlled settings must be observed remotely and tied to an exact candidate SHA before the corresponding Phase 0 criterion is complete.

## Current observed remote state

Observed for `jeremytheva/pourfolio` on 28 August 2026:

- GitHub Issues are enabled and Phase 0 issue #143 exists.
- Default branch is `main`.
- Current observed `main` SHA is `3575ec54c4383226f1c31dfc45bb0e46a1285890`.
- GitHub reports `main` as `protected: false`.
- Branch protection is disabled and no required status checks are configured on `main`.
- Repository rulesets are empty.
- Pull-request validation, browser/accessibility, Dependency Review and CodeQL workflows exist, but their presence is not equivalent to merge enforcement.
- Auto-merge capability being available in the repository is not sufficient evidence of a safe Mergeable boundary while required rules are absent.

These observations are current-state evidence only. Recheck them after configuration changes; do not copy them forward as permanent facts.

## Required relationship to the PR lifecycle

Pourfolio follows:

**Draft → Implementing → Validating → Ready → Mergeable → Merged**

The project may manage implementation and validation states. GitHub must independently enforce the Mergeable boundary. Until the controls below are verified, a merge button or successful CI run must not be interpreted as permission to merge a non-trivial PR.

## Administrator checklist

### Tracker and accountability

- [x] GitHub Issues are enabled and the real Phase 0 issue #143 exists.
- [ ] Create the `Phase 0 — Governed delivery ready` milestone and assign #143.
- [ ] Record the milestone objective, owner, exit criteria and dependency on Phase 0 completion.
- [ ] Record an independent reviewer for the final governance decision.

### `main` protection / ruleset

- [ ] Protect `main` using branch protection or a repository ruleset.
- [ ] Require a pull request before changes reach `main`; direct push must not be a normal production path.
- [ ] Require at least one independent approval where the repository ownership model permits it.
- [ ] Dismiss stale approvals when new commits are pushed.
- [ ] Require strict status checks on the exact current candidate SHA and require the branch to be current with `main`.
- [ ] Require resolution of required review conversations where available.
- [ ] Disable force pushes to `main`.
- [ ] Disable deletion of `main`.
- [ ] Restrict bypass actors to an explicit approved list. If the plan/rule type cannot prevent a bypass, retain an audit record for every bypass and require independent review.

### Required checks

Use a real candidate PR to copy the exact context strings GitHub reports. Workflow/job display names in YAML are hints only; they are not evidence of the check context GitHub exposes for branch protection.

At minimum verify the exact contexts corresponding to:

- `Release gate` / `npm run platform:validate`;
- `Browser and accessibility`;
- `Dependency review`;
- CodeQL JavaScript analysis;
- every stable deployment-status check that must be release-blocking.

Do not configure similarly named stale or push-only contexts. A successful result on an earlier SHA does not satisfy the candidate gate.

### Security and dependency controls

- [ ] Enable Dependency Graph.
- [ ] Verify a successful Dependency Review run on a candidate PR and make the observed context merge-blocking where required.
- [ ] Enable CodeQL/code scanning and make its observed required result merge-blocking.
- [ ] Enable secret scanning and push protection where available.
- [ ] Review Dependabot alerts regularly.
- [ ] Confirm GitHub Actions default permissions and workflow permissions remain least privilege.
- [ ] Ensure untrusted workflows cannot access production secrets.
- [ ] Record the ChatGPT/Codex GitHub App relationship and verify least-privilege repository access.

### Deployment environment

- [ ] Configure appropriate production environment protection.
- [ ] Restrict production secrets to the intended environment and authorised deployers.
- [ ] Record named deployment reviewers if the plan and delivery model support them.
- [ ] Require a stable production deployment status where GitHub exposes one suitable for exact-SHA enforcement.

## Candidate evidence table

Populate this table from one candidate PR. Copy context strings exactly, including capitalisation and punctuation.

| Required result | Observed GitHub context (exact string) | Candidate SHA | Successful run/status evidence |
| --- | --- | --- | --- |
| Release/source validation | _Pending remote observation_ | _Pending_ | _Pending_ |
| Browser and accessibility | _Pending remote observation_ | _Pending_ | _Pending_ |
| Dependency Review | _Pending remote observation_ | _Pending_ | _Pending_ |
| CodeQL JavaScript analysis | _Pending remote observation_ | _Pending_ | _Pending_ |
| Repository deployment status check (one row per context) | _Pending remote observation_ | _Pending_ | _Pending_ |

After recording contexts, compare the configured required-check list character-for-character with this table and capture the comparison in private evidence.

## Release-critical administrator evidence

For each Phase 0 verification, retain a dated GitHub settings export or redacted screenshot showing enough surrounding UI to identify what was inspected. Store sensitive evidence privately and record:

- full repository identity (`owner/repository` and GitHub host where relevant);
- exact 40-character candidate SHA;
- administrator GitHub login and UTC observation time;
- independent reviewer login, review date and decision;
- private evidence reference;
- branch-protection/ruleset name or identifier applying to `main`;
- exact required check contexts;
- force-push/deletion/bypass settings;
- production environment protection state;
- Dependency Graph, CodeQL, secret-scanning and push-protection state.

A repository file, local test result, workflow YAML or proposed setting is not a substitute for this remote evidence.

## Recommended issue/project metadata

Recommended labels include `type: feature`, `type: bug`, `type: architecture`, `type: security`, `type: technical-debt`, `type: documentation`; `priority: P0`–`priority: P3`; lifecycle/status labels as appropriate; and size labels where they provide useful planning signal.

Recommended project fields include **Status**, **Project or product**, **Type**, **Priority**, **Complexity**, **Milestone**, **Codex ready**, and **Dependencies**. The authoritative phase contracts remain in `docs/RELEASE_TRACKING.md` and live GitHub issues.

## Completion rule

Do not mark #143 or the Phase 0 governance gate complete until the remote settings, exact required contexts, security/dependency controls, deployment protection and independent approval are all evidenced against one immutable candidate SHA. Do not weaken or bypass a control to make the checklist appear complete.
