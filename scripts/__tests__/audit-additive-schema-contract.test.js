import assert from 'node:assert/strict'
import test from 'node:test'
import { auditAdditiveSchemaContract } from '../audit-additive-schema-contract.js'

const baselineSchema = `
  CREATE TABLE ratings (
    id bigint unsigned NOT NULL AUTO_INCREMENT,
    user_id varchar(64) DEFAULT NULL,
    rating_id bigint DEFAULT NULL,
    product_id bigint DEFAULT NULL,
    date_rated timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    KEY idx_ratings_product (product_id),
    CONSTRAINT fk_ratings_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

  CREATE TABLE rating_scores (
    id bigint unsigned NOT NULL AUTO_INCREMENT,
    user_id varchar(64) DEFAULT NULL,
    rating_id bigint DEFAULT NULL,
    attribute_id bigint DEFAULT NULL,
    attribute_score int DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_rating_scores_rating (rating_id)
  );

  CREATE TABLE bonus_attribute_rating_mapping (
    id bigint unsigned NOT NULL AUTO_INCREMENT,
    user_id varchar(64) DEFAULT NULL,
    rating_id bigint DEFAULT NULL,
    bonus_attributes_id bigint DEFAULT NULL,
    PRIMARY KEY (id)
  );
`

const profileTable = `
  CREATE TABLE profiles (
    id bigint unsigned NOT NULL AUTO_INCREMENT,
    user_id varchar(64) DEFAULT NULL,
    name varchar(255) DEFAULT NULL,
    description text DEFAULT NULL,
    avatar_url varchar(2048) DEFAULT NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  );
`

const additiveSchema = `${profileTable}
${baselineSchema
  .replace(
    '    date_rated timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),',
    `    date_rated timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    submission_key varchar(255) DEFAULT NULL,
    submission_fingerprint char(64) DEFAULT NULL,
    submission_state enum('pending','complete','failed','deleting','deleted') DEFAULT NULL,
    submission_version int unsigned DEFAULT NULL,
    expected_score_count int unsigned DEFAULT NULL,
    expected_bonus_count int unsigned DEFAULT NULL,
    deleted_at timestamp NULL DEFAULT NULL,`
  )
  .replace(
    '    attribute_score int DEFAULT NULL,',
    `    attribute_score int DEFAULT NULL,
    uniqueness_key varchar(255) DEFAULT NULL,`
  )
  .replace(
    '    bonus_attributes_id bigint DEFAULT NULL,',
    `    bonus_attributes_id bigint DEFAULT NULL,
    uniqueness_key varchar(255) DEFAULT NULL,`
  )}`

test('additive preflight passes only the approved nullable compatibility delta', () => {
  const report = auditAdditiveSchemaContract(baselineSchema, additiveSchema)

  assert.equal(report.status, 'PASS')
  assert.equal(report.reportType, 'ADDITIVE_SCHEMA_AUDIT')
  assert.equal(report.planId, 'PF-P1-S1-ADDITIVE-COMPATIBILITY-V1')
  assert.deepEqual(report.counts, {
    baselineTables: 3,
    candidateTables: 4,
    approvedNewColumns: 9,
    blockers: 0
  })
})

test('additive preflight blocks required fields, populated defaults and early uniqueness', () => {
  const report = auditAdditiveSchemaContract(baselineSchema, additiveSchema
    .replace('submission_key varchar(255) DEFAULT NULL', "submission_key varchar(255) NOT NULL DEFAULT 'legacy'")
    .replace('    KEY idx_ratings_product (product_id),', '    KEY idx_ratings_product (product_id),\n    UNIQUE KEY uq_submission_key (submission_key),'))

  assert.equal(report.status, 'BLOCKED')
  assert.equal(report.countsByCode.ADDITIVE_COLUMN_NOT_NULL, 1)
  assert.equal(report.countsByCode.ADDITIVE_COLUMN_NON_NULL_DEFAULT, 1)
  assert.equal(report.countsByCode.BASELINE_UNIQUE_KEYS_CHANGED, 1)
})

test('additive preflight blocks changes to existing columns and indexes', () => {
  const report = auditAdditiveSchemaContract(baselineSchema, additiveSchema
    .replace(
      'date_rated timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()',
      'date_rated timestamp NOT NULL DEFAULT current_timestamp()'
    )
    .replace('    KEY idx_rating_scores_rating (rating_id)', '    KEY idx_rating_scores_owner (user_id)')
    .replace('ON DELETE RESTRICT', 'ON DELETE CASCADE')
    .replace('ENGINE=InnoDB', 'ENGINE=MyISAM'))

  assert.equal(report.countsByCode.BASELINE_COLUMN_CHANGED, 1)
  assert.equal(report.countsByCode.BASELINE_INDEXES_CHANGED, 1)
  assert.equal(report.countsByCode.BASELINE_FOREIGN_KEYS_CHANGED, 1)
  assert.equal(report.countsByCode.BASELINE_TABLE_OPTIONS_CHANGED, 1)
})

test('additive preflight blocks omitted and unapproved schema objects', () => {
  const withoutScores = additiveSchema.replace(/\s*CREATE TABLE rating_scores \([\s\S]*?\n {2}\);\n/, '\n')
  const report = auditAdditiveSchemaContract(baselineSchema, `${withoutScores}
    CREATE TABLE audit_log (id bigint NOT NULL, PRIMARY KEY (id));`)

  assert.equal(report.countsByCode.BASELINE_TABLE_REMOVED, 1)
  assert.equal(report.countsByCode.UNAPPROVED_TABLE_ADDED, 1)
})

test('additive preflight blocks sensitive profile fields and premature owner controls', () => {
  const report = auditAdditiveSchemaContract(baselineSchema, additiveSchema
    .replace('    avatar_url varchar(2048) DEFAULT NULL,', '    avatar_url varchar(2048) DEFAULT NULL,\n    email varchar(255) DEFAULT NULL,')
    .replace('    user_id varchar(64) DEFAULT NULL,', '    user_id varchar(64) NOT NULL,')
    .replace('    PRIMARY KEY (id)\n  );', '    PRIMARY KEY (id),\n    UNIQUE KEY uq_profiles_user_id (user_id)\n  );'))

  assert.equal(report.countsByCode.PROFILE_SENSITIVE_COLUMN, 1)
  assert.equal(report.countsByCode.PROFILE_COMPATIBILITY_COLUMN_NOT_NULL, 1)
  assert.equal(report.countsByCode.PROFILE_NON_ADDITIVE_UNIQUE_CONTROL, 1)
})

test('additive preflight requires target-capable workflow field types', () => {
  const report = auditAdditiveSchemaContract(baselineSchema, additiveSchema
    .replace("submission_state enum('pending','complete','failed','deleting','deleted')", 'submission_state varchar(16)')
    .replace('submission_version int unsigned', 'submission_version decimal(10,0)')
    .replace('submission_fingerprint char(64)', 'submission_fingerprint varchar(32)'))

  assert.equal(report.countsByCode.ADDITIVE_COLUMN_INCOMPATIBLE_TYPE, 3)
})

test('additive preflight requires an immutable legacy baseline without profiles', () => {
  const report = auditAdditiveSchemaContract(`${profileTable}${baselineSchema}`, additiveSchema)

  assert.equal(report.countsByCode.BASELINE_ALREADY_CONTAINS_PROFILES, 1)
})
