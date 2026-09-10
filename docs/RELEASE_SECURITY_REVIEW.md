# Release security review

The connected staging release workflow checks out the requested immutable release
commit, confirms its SHA, and builds it with the server-only NoCodeBackend and
Upstash values scoped to the `staging-release` environment. Immediately after the
build, `npm run check:release-security` scans both browser source and built output.
Its redacted passing result is retained with the connected release evidence for
that commit.

The workflow supports two entry paths. Manual `workflow_dispatch` retains the
explicit release URL, full release SHA and optional cleanup-guarded destructive
confirmation. The owner-only ChatGPT path is an exact `/release-certify` comment
on issue #278. That path is non-destructive, pins the target to the exact public
Pourfolio Vercel production origin `brew-buds-mobile-app-design-3577.vercel.app`,
and uses the issue-comment event's exact default-branch SHA. Other users, issue
numbers, commands and pull-request comments cannot start the credentialed job.

Both entry paths share the same fail-closed release preflight before protected
release-account credentials are referenced. The target must be an explicitly
approved HTTPS root origin with no userinfo, non-default port, path, query or
fragment. `/api/readiness` must return HTTP 200 with `status: ready`, the exact
requested commit SHA, an accepted Vercel environment and `dataProvider: ok`.
Redirects, malformed responses and provenance drift block the credentialed browser
checks.

This static check only detects accidental browser exposure. Before promoting a
release, a reviewer must separately inspect the deployment platform and record:

- [ ] Environment scoping and protection rules restrict server-only values to the
  intended release environment and server runtimes.
- [ ] Published deployment assets contain no source maps, including maps uploaded
  to monitoring or error-reporting services; if private maps are generated, scan
  them before upload and retain only access-controlled redacted evidence.
- [ ] Published browser artefacts and any source maps contain no server-only
  variable names, configured values, distinctive fingerprints, provider
  privileged URLs, direct NoCodeBackend/Upstash calls or secret-bearing header
  patterns.
- [ ] Runtime and provider logs do not contain credentials, cookies, tokens,
  request bodies, response bodies, provider URLs or other private user data.
- [ ] Build and deployment metadata identifies the same full commit SHA checked by
  the connected release workflow and contains no server-only values.

These platform checks cannot be certified by the repository's static checker and
must remain separate review evidence.

The detailed launch configuration evidence checklist, including staging and production presence-only rows, least-privilege probes, endpoint identity confirmation, request IDs, rotation ownership, rollback ownership and approver identity, is maintained in [Launch configuration evidence procedure](launch-configuration-evidence.md).