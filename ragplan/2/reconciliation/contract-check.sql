-- Isolated design probes only. No enterprise migration, RLS, transport, or journal implementation.
-- Run only in a disposable synthetic database; rolls back all DDL/rows.
\set ON_ERROR_STOP on
BEGIN;
CREATE SCHEMA reconciliation_probe;
SET LOCAL search_path = reconciliation_probe, pg_catalog;
CREATE FUNCTION assert_true(ok boolean, code text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'probe failed: %', code; END IF;
END $$;
SELECT assert_true(current_setting('server_encoding')='UTF8', 'SQL01_utf8');
SELECT assert_true(char_length(normalize(U&'A\0301\+01F600B', NFC))=3, 'SQL02_nfc_astral');
SELECT assert_true((jsonb_build_object('text', E'Điều\t1\n😀\r'))->>'text'=E'Điều\t1\n😀\r', 'SQL03_allowed_controls_roundtrip');
DO $$
DECLARE rejected boolean := false;
BEGIN
  BEGIN PERFORM ('"Điều\u00001"')::jsonb;
  EXCEPTION WHEN SQLSTATE '22P05' OR SQLSTATE '22021' THEN rejected := true; END;
  PERFORM assert_true(rejected, 'SQL04_jsonb_nul_rejected');
END $$;
DO $$
DECLARE rejected boolean := false;
BEGIN
  BEGIN PERFORM ('"\ud800"')::jsonb;
  EXCEPTION WHEN SQLSTATE '22P05' OR SQLSTATE '22021' OR SQLSTATE '22P02' THEN rejected := true; END;
  PERFORM assert_true(rejected, 'SQL05_unpaired_surrogate_rejected');
END $$;
DO $$
DECLARE rejected boolean := false;
BEGIN
  BEGIN PERFORM chr(0);
  EXCEPTION WHEN SQLSTATE '54000' OR SQLSTATE '22021' THEN rejected := true; END;
  PERFORM assert_true(rejected, 'SQL06_text_nul_rejected');
END $$;
CREATE FUNCTION content_or(terms text[]) RETURNS tsquery LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE result tsquery; term text; node tsquery;
BEGIN
  FOREACH term IN ARRAY terms LOOP
    node := plainto_tsquery('simple', term);
    IF numnode(node)>0 THEN
      result := CASE WHEN result IS NULL THEN node ELSE result || node END;
    END IF;
  END LOOP;
  RETURN result;
END $$;
SELECT assert_true(NOT (to_tsvector('simple','Thời hạn thanh toán: 10 ngày.') @@ plainto_tsquery('simple','Xin cho biết thời hạn thanh toán của hợp đồng SYN-001')), 'SQL07_all_question_and_counterexample');
SELECT assert_true(to_tsvector('simple','Thời hạn thanh toán: 10 ngày.') @@ content_or(ARRAY['thời','hạn','thanh','toán','của','hợp','đồng']), 'SQL08_content_or_match');
SELECT assert_true(to_tsvector('simple','thoi han thanh toan') @@ content_or(ARRAY['thoi','han','thanh','toan']), 'SQL09_folded_projection_match');
SELECT assert_true(to_tsvector('simple','Không thanh toán nếu thiếu biên bản.') @@ content_or(ARRAY['không','thanh','toán','nếu','biên','bản']), 'SQL10_condition_terms_retained');
SELECT assert_true(to_tsvector('simple','payment term') @@ content_or(ARRAY['payment','deadline','term']), 'SQL11_english_alias_or');
SELECT assert_true(numnode(content_or(ARRAY['alpha | !beta']))>0, 'SQL12_user_operators_are_plain_terms');
CREATE TABLE source_releases (
  tenant_id uuid NOT NULL, document_id uuid NOT NULL, release_id uuid NOT NULL,
  PRIMARY KEY(tenant_id, release_id), UNIQUE(tenant_id,document_id,release_id)
);
CREATE TABLE corpus_members (
  tenant_id uuid NOT NULL, corpus_revision bigint NOT NULL CHECK(corpus_revision>=0),
  document_id uuid NOT NULL, release_id uuid NOT NULL, rendition_id uuid NOT NULL,
  generation_id uuid NOT NULL, space_id uuid,
  PRIMARY KEY(tenant_id,corpus_revision,release_id,rendition_id),
  FOREIGN KEY(tenant_id,document_id,release_id) REFERENCES source_releases(tenant_id,document_id,release_id)
);
INSERT INTO source_releases VALUES('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000601');
INSERT INTO corpus_members VALUES('00000000-0000-4000-8000-000000000001',1,'00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000601','00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000501',NULL);
DO $$
DECLARE rejected boolean := false;
BEGIN
  BEGIN
    INSERT INTO corpus_members VALUES('00000000-0000-4000-8000-000000000002',1,'00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000601','00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000501',NULL);
  EXCEPTION WHEN foreign_key_violation THEN rejected := true; END;
  PERFORM assert_true(rejected, 'SQL13_cross_tenant_member_fk');
END $$;
DO $$
DECLARE rejected boolean := false;
BEGIN
  BEGIN INSERT INTO corpus_members SELECT * FROM corpus_members;
  EXCEPTION WHEN unique_violation THEN rejected := true; END;
  PERFORM assert_true(rejected, 'SQL14_duplicate_corpus_member');
END $$;
CREATE TABLE semantic_intervals (
  tenant_id uuid NOT NULL, field_id uuid NOT NULL, accepted_at_epoch bigint NOT NULL,
  retracted_at_epoch bigint, PRIMARY KEY(tenant_id,field_id,accepted_at_epoch),
  CHECK(accepted_at_epoch>=0), CHECK(retracted_at_epoch IS NULL OR retracted_at_epoch>accepted_at_epoch)
);
INSERT INTO semantic_intervals VALUES('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000951',9,10);
SELECT assert_true(EXISTS(SELECT 1 FROM semantic_intervals WHERE accepted_at_epoch<=9 AND (retracted_at_epoch IS NULL OR 9<retracted_at_epoch)), 'SQL15_snapshot_before_retraction');
SELECT assert_true(NOT EXISTS(SELECT 1 FROM semantic_intervals WHERE accepted_at_epoch<=10 AND (retracted_at_epoch IS NULL OR 10<retracted_at_epoch)), 'SQL16_snapshot_after_retraction');
CREATE TABLE accepted_identifiers(issuer text NOT NULL,value text NOT NULL,UNIQUE(issuer,value));
INSERT INTO accepted_identifiers VALUES('SYN-ISSUER','0001/HD-01');
SELECT assert_true(EXISTS(SELECT 1 FROM accepted_identifiers WHERE issuer='SYN-ISSUER' AND value='0001/HD-01') AND NOT EXISTS(SELECT 1 FROM accepted_identifiers WHERE issuer='SYN-ISSUER' AND value='1/HD01'), 'SQL17_opaque_identifier_exact');
ROLLBACK;
\echo SQL_PROBES_PASSED_17
