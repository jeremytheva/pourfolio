# Release security review

The connected staging release workflow checks out the requested immutable release
commit, confirms its SHA, and builds it with the server-only NoCodeBackend and
Upstash values scoped to the `staging-release` environment. Immediately after the
build, `npm run check:release-security` scans both browser source and built output.
Its redacted passing result is retained with the connected release evidence for
that commit.

This static check only detects accidental browser exposure. Before promoting a
release, a reviewer must separately inspect the deployment platform and record:

- [ ] Environment scoping and protection rules restrict server-only values to the
  intended release environment and server runtimes.
- [ ] Published deployment assets contain no source maps, including maps uploaded
  to monitoring or error-reporting services.
- [ ] Runtime and provider logs do not contain credentials, request bodies, or
  other private user data.
- [ ] Build and deployment metadata identifies the same full commit SHA checked by
  the connected release workflow and contains no server-only values.

These platform checks cannot be certified by the repository's static checker and
must remain separate review evidence.
