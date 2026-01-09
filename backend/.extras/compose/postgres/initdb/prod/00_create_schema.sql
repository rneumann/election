-- Schema
CREATE SCHEMA IF NOT EXISTS election AUTHORIZATION election;

ALTER ROLE election
SET
  search_path TO election,
  public;

-- Extensions gehören i.d.R. in public
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER SCHEMA election OWNER TO election;

GRANT USAGE ON SCHEMA election TO election;