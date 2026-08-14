import assert from 'node:assert/strict'
import test from 'node:test'
import { auditSchemaContract, fingerprintSchema } from '../audit-schema-contract.js'

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
    submission_version int NOT NULL DEFAULT 0,
    expected_score_count int NOT NULL,
    expected_bonus_count int NOT NULL,
    deleted_at timestamp NULL,
    total_weighted decimal(10,2),
    PRIMARY KEY (id),
    UNIQUE KEY uq_ratings_user_submission (user_id, rating_id),
    UNIQUE KEY uq_ratings_submission_key (submission_key),
    CONSTRAINT fk_ratings_product FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT chk_submission_state CHECK (submission_state IN ('pending', 'complete', 'failed', 'deleting', 'deleted')),
    CONSTRAINT chk_submission_version CHECK (submission_version >= 0),
    CONSTRAINT chk_expected_score_count CHECK (expected_score_count >= 0),
    CONSTRAINT chk_expected_bonus_count CHECK (expected_bonus_count >= 0)
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
    UNIQUE KEY uq_rating_score_idempotency (uniqueness_key),
    CONSTRAINT fk_score_rating FOREIGN KEY (rating_id) REFERENCES ratings (id),
    CONSTRAINT fk_score_attribute FOREIGN KEY (attribute_id) REFERENCES rating_attributes (id),
    CONSTRAINT chk_attribute_score CHECK (attribute_score BETWEEN 1 AND 7)
  );

  CREATE TABLE bonus_attribute_rating_mapping (
    id bigint unsigned NOT NULL AUTO_INCREMENT,
    user_id varchar(36) NOT NULL,
    rating_id bigint unsigned NOT NULL,
    bonus_attributes_id bigint unsigned NOT NULL,
    uniqueness_key varchar(255) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE INDEX uq_rating_bonus (rating_id, bonus_attributes_id),
    UNIQUE INDEX uq_rating_bonus_idempotency (uniqueness_key),
    CONSTRAINT fk_bonus_rating FOREIGN KEY (rating_id) REFERENCES ratings (id),
    CONSTRAINT fk_bonus_attribute FOREIGN KEY (bonus_attributes_id) REFERENCES bonus_attributes (id)
  );
`

test('schema preflight passes an immutable, uniquely constrained rating model', () => {
  const report = auditSchemaContract(compliantSchema)

  assert.equal(report.status, 'PASS')
  assert.equal(report.reportType, 'STRUCTURAL_SQL_AUDIT')
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
    MISSING_REQUIRED_COLUMN: 9,
    NULLABLE_REQUIRED_COLUMN: 10,
    MISSING_UNIQUE_CONSTRAINT: 6,
    MISSING_FOREIGN_KEY: 5,
    MISSING_SCORE_INTEGER_RANGE_ENFORCEMENT: 1,
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

test('structural audit requires canonical foreign-key parent relationships', () => {
  const report = auditSchemaContract(compliantSchema
    .replace('product_id bigint unsigned NOT NULL,', 'product_id bigint unsigned NOT NULL,\n    cellar_id bigint unsigned,')
    .replace('REFERENCES products (id)', 'REFERENCES producers (id)')
    .replace('CONSTRAINT fk_score_attribute FOREIGN KEY (attribute_id) REFERENCES rating_attributes (id),', ''))

  assert.equal(report.status, 'BLOCKED')
  assert.equal(report.countsByCode.MISSING_FOREIGN_KEY, 3)
  assert.ok(report.blockers.some((blocker) =>
    blocker.table === 'ratings' && blocker.column === 'product_id' && blocker.parentTable === 'products'
  ))
  assert.ok(report.blockers.some((blocker) =>
    blocker.table === 'ratings' && blocker.column === 'cellar_id' && blocker.parentTable === 'cellar'
  ))
})

test('structural audit requires integer score range and non-negative workflow counters', () => {
  const report = auditSchemaContract(compliantSchema
    .replace('attribute_score int NOT NULL,', 'attribute_score decimal(2,1) NOT NULL,')
    .replace('CHECK (submission_version >= 0)', 'CHECK (submission_version >= -1)')
    .replace('expected_bonus_count int NOT NULL,', 'expected_bonus_count decimal(10,0) NOT NULL,'))

  assert.deepEqual(report.countsByCode, {
    MISSING_NON_NEGATIVE_INTEGER_ENFORCEMENT: 2,
    MISSING_SCORE_INTEGER_RANGE_ENFORCEMENT: 1
  })
})

test('structural audit requires the exact allowed submission states', () => {
  const report = auditSchemaContract(compliantSchema
    .replace("('pending', 'complete', 'failed', 'deleting', 'deleted')", "('pending', 'complete', 'cancelled')"))

  assert.deepEqual(report.countsByCode, { MISSING_SUBMISSION_STATE_CHECK: 1 })
})

test('structural audit requires a nullable deletion tombstone timestamp', () => {
  const missing = auditSchemaContract(compliantSchema
    .replace('    deleted_at timestamp NULL,\n', ''))
  assert.deepEqual(missing.countsByCode, { MISSING_REQUIRED_COLUMN: 1 })
  assert.ok(missing.blockers.some((blocker) =>
    blocker.table === 'ratings' && blocker.column === 'deleted_at'
  ))

  const nonNullable = auditSchemaContract(compliantSchema
    .replace('deleted_at timestamp NULL', 'deleted_at timestamp NOT NULL'))
  assert.deepEqual(nonNullable.countsByCode, { NON_NULLABLE_REQUIRED_COLUMN: 1 })
})

test('structural audit accepts equivalent unsigned counters and enum state enforcement', () => {
  const report = auditSchemaContract(compliantSchema
    .replace('submission_state varchar(16) NOT NULL,', "submission_state enum('failed', 'pending', 'complete', 'deleting', 'deleted') NOT NULL,")
    .replace("    CONSTRAINT chk_submission_state CHECK (submission_state IN ('pending', 'complete', 'failed', 'deleting', 'deleted')),\n", '')
    .replace('submission_version int NOT NULL DEFAULT 0,', 'submission_version int unsigned NOT NULL DEFAULT 0,')
    .replace('expected_score_count int NOT NULL,', 'expected_score_count int unsigned NOT NULL,')
    .replace('expected_bonus_count int NOT NULL,', 'expected_bonus_count int unsigned NOT NULL,')
    .replace(/ {4}CONSTRAINT chk_(?:submission_version|expected_score_count|expected_bonus_count) CHECK \([^\n]+\),?\n/g, ''))

  assert.equal(report.status, 'PASS')
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

test('schema fingerprints identify the exact audited bytes', () => {
  assert.deepEqual(fingerprintSchema('CREATE TABLE ratings ();\n'), {
    bytes: 25,
    sha256: 'e6bbec45f88d332b0785464ba65b824412a49f5bc04b024a90a0ad388a8e909b'
  })
})
