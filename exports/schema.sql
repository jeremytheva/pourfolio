-- Pourfolio canonical NoCodeBackend schema target
-- Provider migration target: rating workflow/idempotency structural contract
-- Updated for recoverable rating deletion on 2026-08-15.

CREATE TABLE profiles (
  id bigint unsigned NOT NULL AUTO_INCREMENT,
  user_id varchar(64) NOT NULL,
  name varchar(255) DEFAULT NULL,
  description text DEFAULT NULL,
  avatar_url varchar(2048) DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_profiles_user_id (user_id)
);

CREATE TABLE products (
  id bigint unsigned NOT NULL AUTO_INCREMENT,
  product_name varchar(255) NOT NULL,
  product_category_id bigint unsigned DEFAULT NULL,
  producer_id bigint unsigned DEFAULT NULL,
  abv decimal(5,2) DEFAULT NULL,
  ibu decimal(6,2) DEFAULT NULL,
  declared_category varchar(255) DEFAULT NULL,
  edition varchar(255) DEFAULT NULL,
  collaboration varchar(255) DEFAULT NULL,
  product_image varchar(2048) DEFAULT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE producers (
  id bigint unsigned NOT NULL AUTO_INCREMENT,
  producer_name varchar(255) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE categories (
  id bigint unsigned NOT NULL AUTO_INCREMENT,
  category_name varchar(255) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE cellar (
  id bigint unsigned NOT NULL AUTO_INCREMENT,
  user_id varchar(64) NOT NULL,
  product_id bigint unsigned NOT NULL,
  quantity int unsigned NOT NULL DEFAULT 1,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_cellar_product FOREIGN KEY (product_id) REFERENCES products (id)
);

CREATE TABLE rating_attributes (
  id bigint unsigned NOT NULL AUTO_INCREMENT,
  attribute_name varchar(255) NOT NULL,
  attribute_weight decimal(10,4) NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);

CREATE TABLE bonus_attributes (
  id bigint unsigned NOT NULL AUTO_INCREMENT,
  attribute_name varchar(255) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE ratings (
  id bigint unsigned NOT NULL AUTO_INCREMENT,
  user_id varchar(64) NOT NULL,
  rating_id bigint unsigned NOT NULL,
  product_id bigint unsigned NOT NULL,
  cellar_id bigint unsigned DEFAULT NULL,
  date_rated timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_unweighted decimal(10,2) DEFAULT NULL,
  total_weighted decimal(10,2) DEFAULT NULL,
  submission_key varchar(255) NOT NULL,
  submission_fingerprint char(64) NOT NULL,
  submission_state enum('pending','complete','failed','deleting','deleted') NOT NULL,
  submission_version int unsigned NOT NULL DEFAULT 0,
  expected_score_count int unsigned NOT NULL,
  expected_bonus_count int unsigned NOT NULL,
  deleted_at timestamp NULL DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ratings_user_rating_id (user_id, rating_id),
  UNIQUE KEY uq_ratings_submission_key (submission_key),
  CONSTRAINT fk_ratings_product FOREIGN KEY (product_id) REFERENCES products (id),
  CONSTRAINT fk_ratings_cellar FOREIGN KEY (cellar_id) REFERENCES cellar (id)
);

CREATE TABLE rating_scores (
  id bigint unsigned NOT NULL AUTO_INCREMENT,
  user_id varchar(64) NOT NULL,
  rating_id bigint unsigned NOT NULL,
  attribute_id bigint unsigned NOT NULL,
  attribute_score int NOT NULL,
  uniqueness_key varchar(255) NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rating_scores_rating_attribute (rating_id, attribute_id),
  UNIQUE KEY uq_rating_scores_uniqueness_key (uniqueness_key),
  CONSTRAINT fk_rating_scores_rating FOREIGN KEY (rating_id) REFERENCES ratings (id),
  CONSTRAINT fk_rating_scores_attribute FOREIGN KEY (attribute_id) REFERENCES rating_attributes (id),
  CONSTRAINT chk_rating_scores_attribute_score CHECK (attribute_score BETWEEN 1 AND 7)
);

CREATE TABLE bonus_attribute_rating_mapping (
  id bigint unsigned NOT NULL AUTO_INCREMENT,
  user_id varchar(64) NOT NULL,
  rating_id bigint unsigned NOT NULL,
  bonus_attributes_id bigint unsigned NOT NULL,
  uniqueness_key varchar(255) NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_bonus_rating_mapping_rating_bonus (rating_id, bonus_attributes_id),
  UNIQUE KEY uq_bonus_rating_mapping_uniqueness_key (uniqueness_key),
  CONSTRAINT fk_bonus_rating_mapping_rating FOREIGN KEY (rating_id) REFERENCES ratings (id),
  CONSTRAINT fk_bonus_rating_mapping_bonus_attribute FOREIGN KEY (bonus_attributes_id) REFERENCES bonus_attributes (id)
);