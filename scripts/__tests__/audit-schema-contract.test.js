import assert from 'node:assert/strict'
import test from 'node:test'
import { auditSchemaContract } from '../audit-schema-contract.js'

const compliantSchema = `
  CREATE TABLE profiles (
    user_id varchar(36) NOT NULL,
    name varchar(255),
    PRIMARY KEY (user_id)
  );

  CREATE TABLE ratings (
    id bigint unsigned NOT NULL AUTO_INCREMENT,
    user_id varchar(36) NOT NULL,
    rating_id bigint NOT NULL,
    product_id bigint unsigned NOT NULL,
    date_rated timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submission_key varchar(255) NOT NULL,
    submission_fingerprint char(64) NOT NULL,
    submission_state varchar(16) NOT NULL,
    expected_score_count int NOT NULL,
    expected_bonus_count int NOT NULL,
    total_weighted decimal(10,2),
    PRIMARY KEY (id),
    UNIQUE KEY uq_ratings_user_submission (user_id, rating_id),
    UNIQUE KEY uq_ratings_submission_key (submission_key)
  );

  CREATE TABLE rating_scores (
    id bigint unsigned NOT NULL AUTO_INCREMENT,
    user_id varchar(36) NOT NULL,
    rating_id bigint unsigned NOT NULL,
    attribute_id bigint unsigned NOT NULL,
    attribute_score int NOT NULL,
    uniqueness_key varchar(255) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_rating_score UNIQUE (rating_id, attribute_id),
    UNIQUE KEY uq_rating_score_idempotency (uniqueness_key)
  );

  CREATE TABLE bonus_attribute_rating_mapping (
    id bigint unsigned NOT NULL AUTO_INCREMENT,
    user_id varchar(36) NOT NULL,
    rating_id bigint unsigned NOT NULL,
    bonus_attributes_id bigint unsigned NOT NULL,
    uniqueness_key varchar(255) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE INDEX uq_rating_bonus (rating_id, bonus_attributes_id),
    UNIQUE INDEX uq_rating_bonus_idempotency (uniqueness_key)
  );
`

test('schema preflight passes an immutable, uniquely constrained rating model', () => {
  const report = auditSchemaContract(compliantSchema)

  assert.equal(report.status, 'PASS')
  assert.equal(report.counts.tablesChecked, 4)
  assert.equal(report.counts.blockers, 0)
})

test('schema preflight blocks the supplied legacy rating shape', () => {
  const report = auditSchemaContract(`
    CREATE TABLE ratings (
      id bigint unsigned NOT NULL AUTO_INCREMENT,
      user_id varchar(36) DEFAULT NULL,
      rating_id bigint DEFAULT NULL,
      product_id bigint DEFAULT NULL,
      date_rated timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
      PRIMARY KEY (id)
    );
    CREATE TABLE rating_scores (
      id bigint unsigned NOT NULL AUTO_INCREMENT,
      user_id varchar(36) DEFAULT NULL,
      rating_id bigint DEFAULT NULL,
      attribute_id bigint DEFAULT NULL,
      attribute_score int DEFAULT NULL,
      PRIMARY KEY (id)
    );
    CREATE TABLE bonus_attribute_rating_mapping (
      id bigint unsigned NOT NULL AUTO_INCREMENT,
      user_id varchar(36) DEFAULT NULL,
      rating_id bigint DEFAULT NULL,
      bonus_attributes_id bigint DEFAULT NULL,
      PRIMARY KEY (id)
    );
  `)

  assert.equal(report.status, 'BLOCKED')
  assert.deepEqual(report.countsByCode, {
    MISSING_TABLE: 1,
    MISSING_REQUIRED_COLUMN: 7,
    NULLABLE_REQUIRED_COLUMN: 10,
    MISSING_UNIQUE_CONSTRAINT: 6,
    MUTABLE_RATING_TIMESTAMP_DEFAULT: 1
  })
  assert.ok(report.blockers.some((blocker) =>
    blocker.code === 'MUTABLE_RATING_TIMESTAMP_DEFAULT' &&
    blocker.table === 'ratings' &&
    blocker.column === 'date_rated'
  ))
})

test('schema preflight reports missing required columns and timestamp defaults', () => {
  const report = auditSchemaContract(compliantSchema
    .replace('date_rated timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,', 'date_rated timestamp NOT NULL,')
    .replace('attribute_score int NOT NULL,', 'score_value int NOT NULL,'))

  assert.equal(report.status, 'BLOCKED')
  assert.deepEqual(report.countsByCode, {
    MISSING_RATING_TIMESTAMP_DEFAULT: 1,
    MISSING_REQUIRED_COLUMN: 1
  })
})

test('schema parsing supports qualified names, nested types and quoted identifiers', () => {
  const report = auditSchemaContract(compliantSchema
    .replace('CREATE TABLE ratings', 'CREATE TABLE IF NOT EXISTS `rating`.`ratings`')
    .replace('total_weighted decimal(10,2)', '`total_weighted` decimal(10,2)'))

  assert.equal(report.status, 'PASS')
})

test('schema preflight rejects empty or structurally incomplete SQL', () => {
  assert.throws(() => auditSchemaContract(''), /Schema SQL is required/)
  assert.throws(
    () => auditSchemaContract('CREATE TABLE ratings (id bigint;'),
    /unbalanced parentheses/
  )
})
