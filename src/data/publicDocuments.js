const documentMeta = {
  version: 'RC draft 1',
  effectiveDate: 'Not yet effective',
  reviewStatus: 'Pending independent Australian privacy and legal review'
}

export const publicDocuments = {
  privacy: {
    ...documentMeta,
    title: 'Privacy policy',
    summary: 'How Pourfolio proposes to handle personal information for the beer-first service.',
    sections: [
      ['What we collect', 'Account and profile details, authentication records, beer ratings, cellar records, support correspondence, and limited security and service telemetry. Do not put sensitive information in free-text profile, rating, cellar, or support fields.'],
      ['Why we collect it', 'We use this information to provide and secure accounts, the catalogue, ratings, cellar and profile features; respond to support and privacy requests; prevent abuse; and operate and improve the service.'],
      ['How we disclose it', 'We may disclose information to contracted hosting, authentication, data-storage, monitoring and support providers where necessary to run the service, and where required or authorised by Australian law. We do not propose selling personal information. Provider locations and any overseas disclosures must be confirmed by legal review before this policy becomes effective.'],
      ['Access, correction and complaints', 'Use the support route below to request access to or correction of your personal information, or to make a privacy complaint. We will acknowledge the request, verify identity proportionately, and provide the applicable response timeframe and escalation route. Never send passwords or authentication codes.'],
      ['Security and incidents', 'We use access controls, owner-scoped data operations, secure transport and operational monitoring. No online service is risk-free. Suspected security vulnerabilities should be reported privately through the security reporting route, not through public issues.'],
      ['Changes', 'Material changes require a new version, effective date and review. Where appropriate, users will be notified before the change takes effect.']
    ]
  },
  terms: {
    ...documentMeta,
    title: 'Terms of use',
    summary: 'Proposed conditions for using Pourfolio.',
    sections: [
      ['Eligibility and accounts', 'You must be legally permitted to use the service and provide accurate account information. Keep your sign-in method secure and tell support promptly if you believe your account has been compromised. Pourfolio is not a service for purchasing alcohol.'],
      ['Acceptable use', 'Do not break the law, impersonate another person, harass others, probe or bypass security, automate access without permission, upload malicious material, or interfere with the service.'],
      ['Your content', 'You retain rights in content you submit. You give Pourfolio the limited permission needed to host, process and display it to provide the features you select. Do not submit content you lack permission to use.'],
      ['Catalogue and availability', 'Catalogue information and community ratings may be incomplete or inaccurate and are not professional advice. Features may change or be unavailable. Consumer rights that cannot lawfully be excluded remain unaffected.'],
      ['Enforcement and ending use', 'We may restrict content or accounts where reasonably necessary for security, legal compliance or enforcement of these terms. You may stop using the service and request account deletion through support.'],
      ['Governing details', 'The operator identity, Australian jurisdiction, contact details, liability wording and commencement date must be completed and approved by legal review before these terms become effective.']
    ]
  },
  moderation: {
    ...documentMeta,
    title: 'Moderation and escalation',
    summary: 'How to report content or conduct and how proposed moderation decisions are handled.',
    sections: [
      ['Report safely', 'Use the private support route for harassment, unlawful content, impersonation, threats or other conduct concerns. If anyone is in immediate danger, contact local emergency services. Do not include passwords, authentication codes or unnecessary personal information.'],
      ['Triage', 'Reports are prioritised by credible risk of imminent harm, exposure of personal information, unlawful material, targeted abuse, account compromise and service-wide impact. The moderation owner records the decision and limits access to report material.'],
      ['Possible action', 'Proportionate action may include preserving evidence, limiting visibility, removing content, warning or restricting an account, escalating to the technical or privacy owner, or referring a matter where legally required.'],
      ['Review and appeal', 'A person affected by a non-emergency moderation decision may request review through support. A reviewer who did not make the original decision should assess context, policy consistency and any new evidence.'],
      ['Private escalation', 'Operational contacts, on-call routes and sensitive evidence belong in the access-controlled release and incident records. They are intentionally not published on this page. Named ownership and tested escalation routes remain a launch requirement.']
    ]
  },
  support: {
    ...documentMeta,
    title: 'Support',
    summary: 'How to get help without exposing private information.',
    sections: [
      ['Contact availability', 'A monitored public support contact has not yet been approved. The final support address or form, operating hours, expected response times and accessibility alternatives must be published here before launch.'],
      ['What to include', 'Describe the issue, when it happened, the affected page and a non-sensitive correlation ID if one was shown. Redact screenshots and logs. Never send a password, one-time code, session cookie, access token or unnecessary personal information.'],
      ['Account and privacy requests', 'Account recovery, personal-information access, correction, export and deletion require identity verification appropriate to the request. Support will explain the verification method without asking for your password.'],
      ['Security reports', 'Do not publish suspected vulnerabilities or exploit details. Use the repository security reporting route where available, or the approved private security contact once it is listed here.']
    ]
  },
  retention: {
    ...documentMeta,
    title: 'Data retention schedule',
    summary: 'Proposed retention rules for launch data. Final periods require privacy and legal approval.',
    sections: [
      ['Active account data', 'Account/profile, rating and cellar records are retained while the account is active so the requested service can be provided, subject to valid deletion requests and legal requirements.'],
      ['Deletion requests', 'After verified deletion, application records should be removed or irreversibly de-identified from active systems within the approved operational period. The precise period, exceptions and user communications must be confirmed before launch.'],
      ['Security and operational logs', 'Keep allowlisted, redacted telemetry only for the shortest approved period needed for security, reliability and incident investigation. Logs must not contain passwords, tokens, raw request bodies or private application records.'],
      ['Support and moderation records', 'Retain request and decision records only for the approved period needed to resolve the matter, demonstrate fair handling and meet legal obligations. Access must be restricted.'],
      ['Backups', 'Encrypted backups expire on the documented backup cycle. Deleted data may remain inaccessible in backups until expiry and must not be restored into normal use. Restore procedures must reapply deletions where required. Final cycles require owner approval and a successful rehearsal.'],
      ['Review and legal holds', 'The privacy owner reviews the schedule at least annually and when data use, providers, law, incidents or product scope materially change. A lawful preservation requirement may pause deletion for the affected records, with access restricted and the decision documented.']
    ]
  }
}

export const publicDocumentLinks = [
  ['/privacy', 'Privacy'],
  ['/terms', 'Terms'],
  ['/moderation', 'Moderation'],
  ['/support', 'Support'],
  ['/retention', 'Retention']
]
