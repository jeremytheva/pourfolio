# Account-deletion confirmation contract

## Status

`api/_lib/accountDeletionConfirmation.js` implements the source-only exact
confirmation validator for
[Phase 2 issue #153](https://github.com/jeremytheva/pourfolio/issues/153). It
accepts one parsed request object only when its sole field contains the exact
documented ASCII phrase.

The module is not imported by an HTTP handler, provider adapter, job worker,
browser service or page. It does not authenticate, authorise or delete anything.
It performs no request parsing, network access, provider operation, session
operation, logging or persistence. A successful result is therefore only
confirmation-text evidence and is not proof that launch gate G23 or Phase 2 is
complete.

## Server contract

```js
validateAccountDeletionConfirmation({
  confirmation: 'DELETE MY ACCOUNT'
})
```

The input represents a parsed request body supplied by future server
orchestration. A route must enforce request-size, content-type, same-origin,
rate-limit, session and recent-authentication controls before calling the
validator. It must derive the account exclusively from the verified session and
must never combine browser identity or record selectors with this input.

## Exact request shape

The validator fails closed unless all of the following are true:

- the body is a plain object with `Object.prototype` or a null prototype;
- it has exactly one own key and that key is the string `confirmation`;
- `confirmation` is an enumerable data property, not an accessor; and
- its value is a primitive string exactly equal to `DELETE MY ACCOUNT`.

The comparison does not trim, case-fold, collapse whitespace, normalise Unicode
or coerce objects. Lowercase/mixed-case text, leading/trailing or repeated space,
tabs, newlines, non-breaking spaces, zero-width characters and visually similar
Unicode letters all fail. Boxed strings and objects with conversion hooks also
fail without invoking those hooks.

Symbols, non-enumerable extra properties and every additional string field fail.
This prevents a future browser request from supplying `user_id`, account/profile
IDs, record IDs/lists, job IDs, idempotency keys, workflow state or any other
targeting value alongside the phrase.

## Success result

The module returns one frozen result containing only:

| Field | Contract |
| --- | --- |
| `format` | Constant `pourfolio.account-deletion-confirmation`. |
| `schema_version` | Semantic confirmation-result version; initially `1.0.0`. |
| `confirmed` | Constant boolean `true`. |

The result does not copy the phrase, request object, identity, timestamp or any
operational identifier. Identical valid input returns the same immutable value.

## Failure behaviour

Malformed body shape or unexpected properties produce a generic invalid-request
error. A wrong primitive value produces a generic non-match error. Neither error
echoes a property name, supplied phrase, identifier or conversion value. The
validator does not mutate the input and does not invoke a confirmation getter or
string-conversion hook.

The constant phrase is not a secret; the future accessible UI must display it
clearly. Avoiding error echo is still required so request data cannot enter logs
or operational telemetry through an exception message.

## Security boundary

Exact confirmation is only one condition of a future destructive request. The
result does not establish:

- an authenticated or recently authenticated session;
- the account identity, ownership or current account status;
- same-origin/CSRF protection, request-size enforcement or rate limiting;
- replay protection, idempotency, a write fence or durable job state;
- a complete provider snapshot, deletion permission or any completed removal;
- session revocation or authentication-identity deletion; or
- retention, backup, lawful-hold, support or connected-staging approval.

A future endpoint must satisfy every executable-workflow criterion in the
[deletion-plan contract](account-deletion-plan-contract.md) before importing the
validator. It must show scope and irreversibility, offer export, obtain recent
authentication, derive identity only from the session and apply this exact
validator to a size-limited JSON body. The boolean result cannot be persisted or
used as a deletion receipt.

## Accessibility boundary

No UI is implemented. A future destructive control must not be the default
focus; must label and describe the confirmation input; must associate and
announce errors/status; must support keyboard and assistive-technology use; and
must pass the documented WCAG 2.2 AA evidence. Source validation of the phrase
does not satisfy those requirements.

## Source validation

`api/_lib/__tests__/accountDeletionConfirmation.test.js` covers the exact phrase,
null-prototype input, malformed/non-plain bodies, case and whitespace changes,
control/invisible/Unicode variants, identity/record/job extras, symbols,
non-enumerable properties, getters, boxed/coercible values, non-mutation, safe
errors, immutable deterministic output and static provider/route/browser
isolation.

Passing these tests is source evidence only. It does not demonstrate a recent
session, endpoint protection, accessible UI, provider workflow, any deletion,
policy approval or connected staging behaviour.
