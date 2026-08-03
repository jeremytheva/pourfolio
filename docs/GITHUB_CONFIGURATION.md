# Manual GitHub configuration

Repository files cannot configure the following settings. A repository administrator should complete and verify this checklist; it is not evidence that any setting is already enabled.

## Recommended labels
`type: feature`, `type: bug`, `type: architecture`, `type: security`, `type: technical-debt`, `type: documentation`; `priority: P0`–`priority: P3`; `status: blocked`, `status: needs-refinement`, `status: codex-ready`, `status: review`; and `size: XS`, `size: S`, `size: M`, `size: L`, `size: XL`.

## Recommended project fields
Use **Status**, **Project or product**, **Type**, **Priority**, **Complexity**, **Milestone**, **Codex ready**, and **Dependencies**. Recommended Status values: Backlog, Refinement, Ready, In progress, Review, Blocked, and Done.

## Administrator checklist

- [ ] Enable GitHub Issues or nominate and document another issue tracker.
- [ ] Protect the default branch and require pull requests before merging.
- [ ] Require the `Release gate`, `Browser and accessibility`, and CodeQL status checks and branches to be up to date.
- [ ] Dismiss stale approvals when new commits are pushed.
- [ ] Prevent force pushes and branch deletion; enable automatic deletion of merged branches.
- [ ] Enable issue forms and verify `Closes #` issue auto-linking/closing behaviour.
- [ ] Configure required reviewers only when reliable ownership is known; no `CODEOWNERS` file is supplied because ownership is not evidenced in this repository.
- [ ] Enable Dependabot alerts, secret scanning, and push protection where available.
- [ ] Enable Dependency Graph so the dependency review action can operate successfully.
- [ ] Retain the workflow URL, commit SHA and successful `Dependency review` result from a pull-request run before marking Dependency Graph and Dependency Review configuration complete.
- [ ] Make `Dependency review` a required branch-protection check if it must block merging independently of the workflow's failure behaviour.
- [ ] Review Dependabot alerts weekly.
- [ ] Add deployment environment protection and restrict production secret access.
- [ ] Close or archive obsolete Supabase and prototype pull requests that cannot merge into the canonical architecture.
- [ ] Configure authorised Codex repository access and Codex pull-request review where available.
- [ ] Configure GitHub Project fields, labels, and automation.
- [ ] Confirm Actions permissions remain least privilege.

### Release-critical administrator evidence

Before changing any checkbox, record the repository, administrator, UTC time
and a private screenshot or settings-export reference. For the default branch,
prove pull requests and up-to-date `Release gate`, `Browser and accessibility`,
CodeQL checks are required, and force pushes and deletion are disabled. Prove
production environment access and secrets are restricted to authorised
deployers. Prove secret scanning, push protection and Dependency Graph are
enabled rather than merely available under the organisation plan.

The `Dependency review` job has no `continue-on-error` setting and is configured
to fail on vulnerabilities of high severity or above. Dependency Graph must be
enabled for the action to operate successfully. An administrator must observe a
successful `Dependency review` run on a pull request and retain its workflow
URL, commit SHA and result before marking the Dependency Graph and Dependency
Review configuration complete. A job failure fails the workflow; it does not,
by itself, make `Dependency review` a required branch-protection check. Requiring
that check is a separate administrator setting. As of 3 August 2026 this delivery
environment has no Git remote, GitHub CLI or repository-administrator evidence,
so the remote settings remain blocking and are not claimed as complete.
