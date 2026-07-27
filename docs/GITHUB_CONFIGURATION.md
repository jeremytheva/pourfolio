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
- [ ] Review Dependabot alerts weekly.
- [ ] Add deployment environment protection and restrict production secret access.
- [ ] Close or archive obsolete Supabase and prototype pull requests that cannot merge into the canonical architecture.
- [ ] Configure authorised Codex repository access and Codex pull-request review where available.
- [ ] Configure GitHub Project fields, labels, and automation.
- [ ] Confirm Actions permissions remain least privilege.
