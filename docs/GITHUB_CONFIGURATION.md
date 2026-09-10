# Manual GitHub configuration

**Current remote review:** 11 September 2026

Repository files can define workflows and delivery expectations, but they are not evidence that GitHub repository settings are active. Administrator-controlled settings must be observed remotely and tied to an exact candidate SHA before the corresponding governance criterion is complete.

## Current observed remote state

Observed for `jeremytheva/pourfolio` on 11 September 2026:

- GitHub Issues are enabled and governance issue #143 exists.
- Default branch is `main`.
- Current observed `main` SHA for this review is `02c9858135c5fdaefe9b437e7c88d6f2d107b8a2`.
- `GET /repos/jeremytheva/pourfolio/branches/main` reports `protected: false`, `protection.enabled: false`, no required-status contexts, and enforcement level `off`.
- The repository rulesets API returns an empty ruleset collection (`[]`). Therefore no repository ruleset currently protects `main`.
- Direct branch-protection detail returns `403 Resource not accessible by integration`. This does not create uncertainty about the exposed branch summary above: the accessible branch resource itself reports protection disabled. It only prevents inspection of administrator-only detail that is not active in the exposed summary.
- Pull-request validation and CodeQL workflows exist and have successful current runs. Their underlying results are useful project evidence and diagnostics, but GitHub Actions status is not itself an automatic merge gate under the adopted project policy.
- Normal autonomous project pull requests are non-draft by default. Lifecycle state is represented by repository/PR metadata rather than GitHub Draft.
- Current workflow files explicitly constrain token permissions: pull-request validation is `contents: read`; CodeQL is `contents: read` plus `security-events: write`; connected-provider and connected-release checks are `contents: read`; PR lifecycle defaults to `permissions: {}` and grants mutation permissions per job.
- Dependency Review and CodeQL are actively executing successfully on current project PRs, establishing that those supporting security diagnostics are enabled and usable.

These observations are current-state evidence only. Recheck them after repository-settings changes; do not copy them forward as permanent facts.

## Relationship to the PR lifecycle

Pourfolio follows:

**Implementing → Validating → Ready → Mergeable → Merged**, with **Blocked** as an overlay.

GitHub Draft is exceptional and is reserved for work that genuinely should not yet be reviewable/mergeable or where substantial intended implementation is deliberately incomplete. Pending validation alone is not a reason to use Draft.

GitHub provides repository controls, review state, merge conflict detection, workflow diagnostics and auditability. It does **not** replace the repository's project-owned acceptance process. A PR becomes project-mergeable only when implementation is complete, canonical project-owned validation is sufficient, applicable browser/runtime/deployment evidence is sufficient for the change, material review findings are resolved, there is no merge conflict and no material blocker remains.

A failing, pending or unavailable hosted check is not automatically a merge veto. Any real implementation, security, accessibility, data-integrity or release defect exposed by that check remains actionable and must be repaired.

## Administrator checklist

### Tracker and accountability

- [x] GitHub Issues are enabled and the real governance issue #143 exists.
- [ ] Create the `Phase 0 — Governed delivery ready` milestone and assign #143 if it is still useful under the current roadmap.
- [ ] Record any still-required milestone objective, owner and exit criteria.
- [ ] Record independent review where a governance change materially requires it.

### `main` protection / ruleset

Current evidence shows these controls are **not configured**. They remain administrator actions rather than repository-source tasks.

- [ ] Protect `main` using branch protection or a repository ruleset where supported by the repository plan and operating model.
- [ ] Require a pull request before changes reach `main`; direct push must not be the normal production path.
- [ ] Require resolution of review conversations where practical.
- [ ] Disable force pushes to `main`.
- [ ] Disable deletion of `main`.
- [ ] Restrict bypass actors to an explicit approved list where the platform supports it. If a bypass cannot be prevented, retain an audit record for every bypass.

Do **not** duplicate the repository acceptance contract by making every GitHub Actions job a mandatory required status check merely because it exists. Required GitHub controls should enforce repository integrity and the intended review path, while project-owned validation remains authoritative for acceptance.

### Validation and diagnostic checks

Use real candidate PRs to record the exact context strings GitHub reports. Workflow/job display names in YAML are discovery hints only; they are not evidence that a repository rule is configured.

Current useful diagnostic/project-evidence contexts include:

- `Release gate` / canonical `npm run platform:validate` execution;
- `Browser and accessibility` where applicable;
- `Dependency review`;
- CodeQL JavaScript analysis;
- Vercel deployment evidence where applicable to the changed application.

These results should be inspected for real defects and exact-head relevance. They need not all be configured as GitHub-required checks unless a deliberate repository-governance decision separately makes a particular context mandatory.

### Security and dependency controls

- [ ] Enable/verify Dependency Graph where available. This administrator-owned setting is not exposed by the current integration evidence.
- [x] Keep Dependency Review available as supporting security evidence and repair substantive findings. Successful current PR runs verify availability.
- [x] Keep CodeQL/code scanning enabled where useful and repair substantive findings. Successful current PR runs verify availability.
- [ ] Enable/verify secret scanning and push protection where available. Current integration evidence does not expose these administrator settings.
- [ ] Review Dependabot alerts regularly.
- [x] Confirm GitHub Actions workflow permissions remain least privilege at source level. Current workflows explicitly use read-only defaults or minimal job-specific write permissions.
- [ ] Ensure untrusted workflows cannot access production secrets. Workflow source minimises token authority, but repository/environment secret-policy settings still require administrator evidence.
- [ ] Record the ChatGPT/Codex GitHub App relationship and verify least-privilege repository access. The current connector can perform repository content/issue/PR operations but administrator-owned installation scoping is not exposed sufficiently for certification.

### Deployment environment

- [ ] Configure/verify appropriate production environment protection where supported and useful.
- [ ] Restrict production secrets to the intended environment and authorised deployers.
- [ ] Record named deployment reviewers only where the plan and delivery model require them.
- [x] Preserve exact-SHA production deployment provenance and runtime evidence as part of the project release process. Existing release/certification workflows and recorded production evidence implement this repository-side practice.

## Current remote enforcement finding

As of this review, `main` is **not protected by GitHub branch protection or a repository ruleset**. This is a real remaining #143 governance item, not a launch-code defect and not a reason to misclassify otherwise validated implementation work as blocked under the adopted PR policy.

Recommended administrator action is to add a lightweight `main` protection/ruleset that, where supported:

1. requires changes to reach `main` through pull requests;
2. prevents force pushes and deletion;
3. requires review-conversation resolution where practical;
4. limits bypass to explicitly approved actors;
5. does **not** automatically duplicate the repository acceptance contract by requiring every hosted diagnostic status check.

Repository-source automation cannot truthfully mark those settings complete until remote evidence confirms they are active.

## Observed check-context discovery evidence

The following exact successful job names were historically observed on PR #247 head `0245a1f0b5e87920896d047b81f185d3dff64fc6`. This table is valid for **context discovery only**, not current-head acceptance after later commits.

| Result | Observed GitHub job/context name | Discovery SHA | Evidence |
| --- | --- | --- | --- |
| Release/source validation | `Release gate` | `0245a1f0b5e87920896d047b81f185d3dff64fc6` | Pull request validation workflow run 33216513042 |
| Browser and accessibility | `Browser and accessibility` | `0245a1f0b5e87920896d047b81f185d3dff64fc6` | Pull request validation workflow run 33216513042 |
| Dependency Review | `Dependency review` | `0245a1f0b5e87920896d047b81f185d3dff64fc6` | Pull request validation workflow run 33216513042 |
| CodeQL JavaScript analysis | `Analyse JavaScript` | `0245a1f0b5e87920896d047b81f185d3dff64fc6` | CodeQL workflow run 33216513056 |
| Repository deployment status check | _Governed observation when needed_ | _Pending_ | _Pending_ |

The current PR policy uses these hosted results as supporting evidence and diagnostics. Do not infer a mandatory GitHub merge gate from the existence of these contexts.

## Release-critical administrator evidence

For each governance verification that depends on GitHub-owned settings, retain a dated GitHub settings export or redacted screenshot showing enough surrounding UI to identify what was inspected. Store sensitive evidence privately and record, as applicable:

- full repository identity (`owner/repository` and GitHub host where relevant);
- exact 40-character candidate SHA;
- administrator GitHub login and UTC observation time;
- private evidence reference;
- branch-protection/ruleset name or identifier applying to `main`;
- force-push/deletion/bypass settings;
- production environment protection state;
- Dependency Graph, CodeQL, secret-scanning and push-protection state.

A repository file, local test result, workflow YAML or proposed setting is not a substitute for remote settings evidence. Equally, a green hosted check does not substitute for the repository's canonical acceptance evidence.

## Recommended issue/project metadata

Recommended labels include `type: feature`, `type: bug`, `type: architecture`, `type: security`, `type: technical-debt`, `type: documentation`; `priority: P0`–`priority: P3`; lifecycle/status labels as appropriate; and size labels where they provide useful planning signal.

Recommended project fields include **Status**, **Project or product**, **Type**, **Priority**, **Complexity**, **Milestone**, **Codex ready**, and **Dependencies**. The authoritative phase contracts remain in `docs/RELEASE_TRACKING.md` and live GitHub issues.

## Completion rule

Do not mark #143 complete until the practical repository-hardening items that remain valuable are either implemented with remote evidence or intentionally dispositioned. Do not use #143 as a blanket blocker for ordinary mergeable work, and do not weaken a substantive security or repository-integrity control merely to make the checklist appear complete.
